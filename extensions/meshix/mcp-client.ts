import {
  MCP_GET_ACCOUNT_STATUS_TOOL,
  MCP_GET_DESIGN_ASSETS_TOOL,
  MCP_GET_DESIGN_TOOL,
  MCP_LIST_DESIGNS_TOOL,
  MCP_PREPARE_CAD_REQUEST_TOOL,
  MCP_REVISE_DESIGN_TOOL,
  MESHIX_BASE_URL,
  MESHIX_MCP_PROTOCOL_VERSION,
  type AccountStatusResult,
  type DesignAssetsResult,
  type DesignListResult,
  type DesignStatusResult,
  type JsonRpcId,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type McpToolCallResult,
  type PrepareCadRequestResult,
  type RevisionResult,
} from "./types.ts";

export interface MeshixMcpClientOptions {
  accessToken: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  protocolVersion?: string;
}

export class McpHttpError extends Error {
  responseBody: string;
  status: number;

  constructor(status: number, statusText: string, responseBody: string) {
    super(`Meshix MCP HTTP ${status} ${statusText}: ${responseBody}`);
    this.name = "McpHttpError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export class McpJsonRpcError extends Error {
  code: number;
  data: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(`Meshix MCP JSON-RPC ${code}: ${message}`);
    this.name = "McpJsonRpcError";
    this.code = code;
    this.data = data;
  }
}

export function normalizeBaseUrl(baseUrl: string) {
  return new URL(baseUrl).origin;
}

export function buildJsonRpcRequest(method: string, params?: unknown, id: JsonRpcId = 1): JsonRpcRequest {
  return params === undefined
    ? { id, jsonrpc: "2.0", method }
    : { id, jsonrpc: "2.0", method, params };
}

function extractToolErrorMessage(result: McpToolCallResult<unknown>) {
  const text = result.content
    ?.filter((part): part is { text: string; type: "text" } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
  return text || "Meshix MCP tool returned an error.";
}

export class MeshixMcpClient {
  private accessToken: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private nextRequestId = 1;
  private readonly protocolVersion: string;

  constructor({
    accessToken,
    baseUrl = MESHIX_BASE_URL,
    fetchImpl = fetch,
    protocolVersion = MESHIX_MCP_PROTOCOL_VERSION,
  }: MeshixMcpClientOptions) {
    this.accessToken = accessToken;
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.fetchImpl = fetchImpl;
    this.protocolVersion = protocolVersion;
  }

  setAccessToken(accessToken: string) {
    this.accessToken = accessToken;
  }

  async request<TResult>(method: string, params?: unknown): Promise<TResult> {
    const body = buildJsonRpcRequest(method, params, this.nextRequestId++);
    const response = await this.fetchImpl(new URL("/mcp", this.baseUrl), {
      body: JSON.stringify(body),
      headers: {
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
        "mcp-protocol-version": this.protocolVersion,
      },
      method: "POST",
    });
    const text = await response.text();
    if (!response.ok) {
      throw new McpHttpError(response.status, response.statusText, text);
    }
    if (!text.trim()) {
      return undefined as TResult;
    }

    const payload = JSON.parse(text) as JsonRpcResponse<TResult>;
    if (payload.error) {
      throw new McpJsonRpcError(payload.error.code, payload.error.message, payload.error.data);
    }
    return payload.result as TResult;
  }

  async initialize() {
    return await this.request<{
      protocolVersion: string;
      serverInfo: { name: string; version: string };
    }>("initialize", {
      capabilities: {},
      clientInfo: { name: "meshix-pi-extension", version: "0.1.0" },
      protocolVersion: this.protocolVersion,
    });
  }

  async listTools() {
    return await this.request<{
      tools: Array<{ description?: string; name: string }>;
    }>("tools/list");
  }

  async callTool<TStructuredContent>(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<TStructuredContent> {
    const result = await this.request<McpToolCallResult<TStructuredContent>>("tools/call", {
      arguments: args,
      name,
    });
    if (result.isError) {
      throw new Error(extractToolErrorMessage(result));
    }
    if (!result.structuredContent) {
      throw new Error(`Meshix MCP ${name} returned no structuredContent.`);
    }
    return result.structuredContent;
  }

  async getAccountStatus() {
    return await this.callTool<AccountStatusResult>(MCP_GET_ACCOUNT_STATUS_TOOL);
  }

  async prepareCadRequest(args: Record<string, unknown>) {
    return await this.callTool<PrepareCadRequestResult>(MCP_PREPARE_CAD_REQUEST_TOOL, args);
  }

  async getDesign(designId: string) {
    return await this.callTool<DesignStatusResult>(MCP_GET_DESIGN_TOOL, { design_id: designId });
  }

  async getDesignAssets(designId: string, kinds?: string[]) {
    return await this.callTool<DesignAssetsResult>(MCP_GET_DESIGN_ASSETS_TOOL, {
      design_id: designId,
      ...(kinds?.length ? { kinds } : {}),
    });
  }

  async listDesigns(args: Record<string, unknown> = {}) {
    return await this.callTool<DesignListResult>(MCP_LIST_DESIGNS_TOOL, args);
  }

  async reviseDesign(args: Record<string, unknown>) {
    return await this.callTool<RevisionResult>(MCP_REVISE_DESIGN_TOOL, args);
  }
}
