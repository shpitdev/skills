import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  MESHIX_BASE_URL,
  type DynamicClientRegistration,
  type OAuthServerMetadata,
  type ProtectedResourceMetadata,
  type StoredMeshixOAuthSession,
  type TokenEndpointResponse,
  type TokenSet,
} from "./types.ts";

const CALLBACK_PORT = 18_792;
const OAUTH_SCOPE = "openid profile email offline_access";
const TOKEN_EXPIRY_SKEW_MS = 60_000;

interface DiscoverOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  resourceMetadataUrl?: string;
}

interface ResolveTokenOptions extends DiscoverOptions {
  allowInteractiveLogin: boolean;
  callbackPort?: number;
  forceLogin?: boolean;
  now?: () => number;
  onAuthorizationUrl?: (url: string) => void;
  openBrowser?: (url: string) => Promise<boolean>;
  stateDir?: string;
}

interface TokenStore {
  clear(resource: string): Promise<void>;
  description: string;
  read(resource: string): Promise<StoredMeshixOAuthSession | null>;
  write(resource: string, session: StoredMeshixOAuthSession): Promise<void>;
}

export interface MeshixOAuthDiscovery {
  authorizationServer: OAuthServerMetadata;
  baseUrl: string;
  protectedResource: ProtectedResourceMetadata;
}

export interface MeshixAccessTokenResult {
  accessToken: string;
  resource: string;
  session: StoredMeshixOAuthSession;
  source: "cache" | "interactive" | "refresh";
  storeDescription: string;
}

function normalizeBaseUrl(baseUrl: string) {
  return new URL(baseUrl).origin;
}

function normalizePath(pathname: string) {
  return pathname.replace(/\/+$/u, "") || "/";
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/gu, "_");
}

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : undefined;
}

function base64Url(buffer: Uint8Array | Buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/u, "");
}

function randomString(bytes = 32) {
  return base64Url(randomBytes(bytes));
}

function pkceChallenge(verifier: string) {
  return base64Url(createHash("sha256").update(verifier).digest());
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }
  return JSON.parse(text) as T;
}

async function postForm<T>(fetchImpl: typeof fetch, url: string, values: Record<string, string>) {
  return await readJson<T>(
    await fetchImpl(url, {
      body: new URLSearchParams(values),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    })
  );
}

function toTokenSet(response: TokenEndpointResponse, now: number): TokenSet {
  if (!response.access_token) {
    throw new Error("OAuth token response did not include an access_token.");
  }
  return {
    access_token: response.access_token,
    expires_at: now + Math.max(response.expires_in ?? 300, 1) * 1000,
    id_token: response.id_token,
    refresh_token: response.refresh_token,
    scope: response.scope,
    token_type: response.token_type ?? "Bearer",
  };
}

function tokenIsFresh(tokens: TokenSet | undefined, now: number) {
  return Boolean(tokens?.access_token && tokens.expires_at - TOKEN_EXPIRY_SKEW_MS > now);
}

export function protectedResourceMetadataUrl(resource: string) {
  const resourceUrl = new URL(resource);
  const resourcePath = resourceUrl.pathname.replace(/\/+$/u, "");
  resourceUrl.pathname = `/.well-known/oauth-protected-resource${resourcePath}`;
  resourceUrl.hash = "";
  return resourceUrl;
}

function oauthAuthorizationServerMetadataUrl(issuer: string) {
  const issuerUrl = new URL(issuer);
  const issuerPath = issuerUrl.pathname.replace(/\/+$/u, "");
  issuerUrl.pathname = `/.well-known/oauth-authorization-server${issuerPath}`;
  issuerUrl.search = "";
  issuerUrl.hash = "";
  return issuerUrl;
}

function assertTrustedProtectedResource(baseUrl: string, protectedResource: ProtectedResourceMetadata) {
  const normalizedBaseUrl = new URL(baseUrl);
  const resourceUrl = new URL(protectedResource.resource);
  if (resourceUrl.origin === normalizedBaseUrl.origin && normalizePath(resourceUrl.pathname) === "/mcp") {
    return;
  }
  throw new Error(`MCP protected-resource metadata is not trusted for ${normalizedBaseUrl.origin}.`);
}

export async function discoverMeshixOAuth({
  baseUrl = MESHIX_BASE_URL,
  fetchImpl = fetch,
  resourceMetadataUrl,
}: DiscoverOptions = {}): Promise<MeshixOAuthDiscovery> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const mcpResource = new URL("/mcp", normalizedBaseUrl).toString();
  const metadataUrl = resourceMetadataUrl ?? protectedResourceMetadataUrl(mcpResource).toString();
  const protectedResource = await readJson<ProtectedResourceMetadata>(await fetchImpl(metadataUrl));
  assertTrustedProtectedResource(normalizedBaseUrl, protectedResource);

  const issuer = protectedResource.authorization_servers.at(0);
  if (!issuer) {
    throw new Error("MCP metadata did not include an authorization server.");
  }

  const authorizationServer = await readJson<OAuthServerMetadata>(
    await fetchImpl(oauthAuthorizationServerMetadataUrl(issuer))
  );
  if (authorizationServer.issuer !== issuer) {
    throw new Error(`MCP auth metadata issuer mismatch: ${authorizationServer.issuer} !== ${issuer}`);
  }
  return { authorizationServer, baseUrl: normalizedBaseUrl, protectedResource };
}

export function resolvePiMeshixStateDir(env: Record<string, string | undefined> = process.env) {
  const piRoot = env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
  return join(piRoot, "state", "meshix");
}

function createFileTokenStore(stateDir = resolvePiMeshixStateDir()): TokenStore {
  const fileForResource = (resource: string) => join(stateDir, `${safeFileName(resource)}.oauth.json`);
  return {
    description: `Pi local state ${stateDir}`,
    async clear(resource) {
      try {
        await unlink(fileForResource(resource));
      } catch (error) {
        if (errorCode(error) !== "ENOENT") {
          throw error;
        }
      }
    },
    async read(resource) {
      try {
        const raw = await readFile(fileForResource(resource), "utf8");
        return JSON.parse(raw) as StoredMeshixOAuthSession;
      } catch (error) {
        if (errorCode(error) === "ENOENT") {
          return null;
        }
        throw error;
      }
    },
    async write(resource, session) {
      await mkdir(stateDir, { mode: 0o700, recursive: true });
      await writeFile(fileForResource(resource), JSON.stringify(session, null, 2), {
        encoding: "utf8",
        mode: 0o600,
      });
    },
  };
}

export async function registerMeshixOAuthClient({
  authorizationServer,
  fetchImpl,
  redirectUri,
}: {
  authorizationServer: OAuthServerMetadata;
  fetchImpl: typeof fetch;
  redirectUri: string;
}) {
  if (!authorizationServer.registration_endpoint) {
    throw new Error("OAuth server metadata did not include a DCR registration endpoint.");
  }
  if (
    authorizationServer.token_endpoint_auth_methods_supported &&
    !authorizationServer.token_endpoint_auth_methods_supported.includes("none")
  ) {
    throw new Error("OAuth server does not advertise public-client token auth.");
  }

  const client = await readJson<DynamicClientRegistration>(
    await fetchImpl(authorizationServer.registration_endpoint, {
      body: JSON.stringify({
        client_name: "Meshix for Pi",
        grant_types: ["authorization_code", "refresh_token"],
        redirect_uris: [redirectUri],
        response_types: ["code"],
        scope: OAUTH_SCOPE,
        token_endpoint_auth_method: "none",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  if (!client.client_id) {
    throw new Error("OAuth dynamic client registration did not return a client_id.");
  }
  return client;
}

async function refreshTokens({
  authorizationServer,
  client,
  fetchImpl,
  now,
  refreshToken,
  resource,
}: {
  authorizationServer: OAuthServerMetadata;
  client: DynamicClientRegistration;
  fetchImpl: typeof fetch;
  now: number;
  refreshToken: string;
  resource: string;
}) {
  const tokenResponse = await postForm<TokenEndpointResponse>(fetchImpl, authorizationServer.token_endpoint, {
    client_id: client.client_id,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    resource,
  });
  const tokenSet = toTokenSet(tokenResponse, now);
  return {
    ...tokenSet,
    refresh_token: tokenSet.refresh_token ?? refreshToken,
  };
}

async function waitForAuthorizationCode({
  authorizationUrl,
  onAuthorizationUrl,
  openBrowser,
  port,
  state,
}: {
  authorizationUrl: string;
  onAuthorizationUrl?: (url: string) => void;
  openBrowser?: (url: string) => Promise<boolean>;
  port: number;
  state: string;
}) {
  return await new Promise<{ code: string }>((resolve, reject) => {
    const server = createServer((request: IncomingMessage, response: ServerResponse) => {
      try {
        const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
        if (url.pathname !== "/callback") {
          response.writeHead(404).end("Not found");
          return;
        }
        if (url.searchParams.get("state") !== state) {
          response.writeHead(400).end("Invalid OAuth state.");
          reject(new Error("OAuth callback state did not match."));
          server.close();
          return;
        }
        const error = url.searchParams.get("error");
        if (error) {
          const description = url.searchParams.get("error_description") ?? error;
          response.writeHead(400).end(description);
          reject(new Error(`OAuth authorization failed: ${description}`));
          server.close();
          return;
        }
        const code = url.searchParams.get("code");
        if (!code) {
          response.writeHead(400).end("Missing authorization code.");
          reject(new Error("OAuth callback did not include a code."));
          server.close();
          return;
        }

        response
          .writeHead(200, { "content-type": "text/plain; charset=utf-8" })
          .end("Meshix login complete. You can close this tab.");
        resolve({ code });
        server.close();
      } catch (error) {
        reject(error);
        server.close();
      }
    });

    server.on("error", reject);
    server.listen(port, "127.0.0.1", async () => {
      onAuthorizationUrl?.(authorizationUrl);
      const opened = await openBrowser?.(authorizationUrl);
      if (opened === false) {
        console.log(`Open this URL to sign in to Meshix:\n${authorizationUrl}`);
      }
    });
  });
}

export async function openExternalUrl(url: string): Promise<boolean> {
  const [command, ...args] =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];

  return await new Promise<boolean>((resolve) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });
    child.on("error", () => resolve(false));
    child.on("spawn", () => {
      child.unref();
      resolve(true);
    });
  });
}

async function runInteractiveLogin({
  authorizationServer,
  client,
  fetchImpl,
  now,
  onAuthorizationUrl,
  openBrowser,
  port,
  redirectUri,
  resource,
}: {
  authorizationServer: OAuthServerMetadata;
  client: DynamicClientRegistration;
  fetchImpl: typeof fetch;
  now: number;
  onAuthorizationUrl?: (url: string) => void;
  openBrowser?: (url: string) => Promise<boolean>;
  port: number;
  redirectUri: string;
  resource: string;
}) {
  const verifier = randomString(48);
  const authorizationUrl = new URL(authorizationServer.authorization_endpoint);
  const state = randomString(24);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", client.client_id);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("scope", OAUTH_SCOPE);
  authorizationUrl.searchParams.set("code_challenge", pkceChallenge(verifier));
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("resource", resource);

  const { code } = await waitForAuthorizationCode({
    authorizationUrl: authorizationUrl.toString(),
    onAuthorizationUrl,
    openBrowser,
    port,
    state,
  });

  const tokenResponse = await postForm<TokenEndpointResponse>(fetchImpl, authorizationServer.token_endpoint, {
    client_id: client.client_id,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    resource,
  });
  return toTokenSet(tokenResponse, now);
}

export async function resolveMeshixAccessToken({
  allowInteractiveLogin,
  baseUrl = MESHIX_BASE_URL,
  callbackPort = CALLBACK_PORT,
  fetchImpl = fetch,
  forceLogin = false,
  now = () => Date.now(),
  onAuthorizationUrl,
  openBrowser = openExternalUrl,
  resourceMetadataUrl,
  stateDir,
}: ResolveTokenOptions): Promise<MeshixAccessTokenResult> {
  const { authorizationServer, protectedResource } = await discoverMeshixOAuth({
    baseUrl,
    fetchImpl,
    resourceMetadataUrl,
  });
  const store = createFileTokenStore(stateDir);
  const resource = protectedResource.resource;
  const stored = await store.read(resource);
  const redirectUri = `http://127.0.0.1:${callbackPort}/callback`;
  let session =
    stored?.resource === resource && stored.authorizationServer.issuer === authorizationServer.issuer ? stored : null;

  if (!forceLogin && session?.tokens && tokenIsFresh(session.tokens, now())) {
    return {
      accessToken: session.tokens.access_token,
      resource,
      session,
      source: "cache",
      storeDescription: store.description,
    };
  }

  if (!forceLogin && session?.tokens?.refresh_token) {
    try {
      const tokens = await refreshTokens({
        authorizationServer,
        client: session.client,
        fetchImpl,
        now: now(),
        refreshToken: session.tokens.refresh_token,
        resource,
      });
      session = {
        ...session,
        authorizationServer,
        tokens,
        updatedAt: new Date(now()).toISOString(),
      };
      await store.write(resource, session);
      return {
        accessToken: tokens.access_token,
        resource,
        session,
        source: "refresh",
        storeDescription: store.description,
      };
    } catch (error) {
      if (!allowInteractiveLogin) {
        throw error;
      }
      console.warn(`Stored Meshix refresh token failed; restarting OAuth: ${String(error)}`);
    }
  }

  if (!allowInteractiveLogin) {
    throw new Error(`No fresh Meshix token is available in ${store.description}. Run /meshix-login first.`);
  }

  const client =
    !forceLogin && session?.client?.redirect_uris?.includes(redirectUri)
      ? session.client
      : await registerMeshixOAuthClient({
          authorizationServer,
          fetchImpl,
          redirectUri,
        });
  const tokens = await runInteractiveLogin({
    authorizationServer,
    client,
    fetchImpl,
    now: now(),
    onAuthorizationUrl,
    openBrowser,
    port: callbackPort,
    redirectUri,
    resource,
  });
  session = {
    authorizationServer,
    baseUrl: normalizeBaseUrl(baseUrl),
    client,
    resource,
    tokens,
    updatedAt: new Date(now()).toISOString(),
    version: 1,
  };
  await store.write(resource, session);

  return {
    accessToken: tokens.access_token,
    resource,
    session,
    source: "interactive",
    storeDescription: store.description,
  };
}

export async function clearMeshixOAuthState(options: DiscoverOptions & { stateDir?: string } = {}) {
  const { protectedResource } = await discoverMeshixOAuth(options);
  await createFileTokenStore(options.stateDir).clear(protectedResource.resource);
}
