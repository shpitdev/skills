import assert from "node:assert/strict";
import { buildMissingFieldPrompts } from "./index.ts";
import { buildJsonRpcRequest, MeshixMcpClient } from "./mcp-client.ts";
import { discoverMeshixOAuth, protectedResourceMetadataUrl } from "./oauth.ts";
import { imageProtocolFromProcessNames, normalizeImageProtocolOverride } from "./pi-renderer.ts";
import { buildDesignContent, isTerminalDesignState, selectRenderAssets } from "./renderers.ts";
import type { McpAsset } from "./types.ts";

async function testOAuthDiscoveryParsing() {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (url) => {
    const href = url.toString();
    calls.push(href);
    if (href === "https://meshix.example/.well-known/oauth-protected-resource/mcp") {
      return Response.json({
        authorization_servers: ["https://auth.meshix.example"],
        bearer_methods_supported: ["header"],
        resource: "https://meshix.example/mcp",
        resource_name: "Meshix MCP",
      });
    }
    if (href === "https://auth.meshix.example/.well-known/oauth-authorization-server") {
      return Response.json({
        authorization_endpoint: "https://auth.meshix.example/authorize",
        issuer: "https://auth.meshix.example",
        registration_endpoint: "https://auth.meshix.example/register",
        token_endpoint: "https://auth.meshix.example/token",
        token_endpoint_auth_methods_supported: ["none"],
      });
    }
    return new Response("not found", { status: 404 });
  };

  const discovery = await discoverMeshixOAuth({ baseUrl: "https://meshix.example", fetchImpl });
  assert.equal(discovery.protectedResource.resource, "https://meshix.example/mcp");
  assert.equal(discovery.authorizationServer.token_endpoint, "https://auth.meshix.example/token");
  assert.deepEqual(calls, [
    "https://meshix.example/.well-known/oauth-protected-resource/mcp",
    "https://auth.meshix.example/.well-known/oauth-authorization-server",
  ]);
  assert.equal(
    protectedResourceMetadataUrl("https://meshix.example/mcp?tenant=acme").toString(),
    "https://meshix.example/.well-known/oauth-protected-resource/mcp?tenant=acme"
  );
}

async function testJsonRpcRequestConstruction() {
  const request = buildJsonRpcRequest("tools/list", undefined, "tools");
  assert.deepEqual(request, { id: "tools", jsonrpc: "2.0", method: "tools/list" });

  const fetchImpl: typeof fetch = async (url, init) => {
    assert.equal(url.toString(), "https://meshix.example/mcp");
    assert.equal(init?.method, "POST");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("authorization"), "Bearer test-token");
    assert.equal(headers.get("mcp-protocol-version"), "2025-06-18");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/list",
    });
    return Response.json({ id: 1, jsonrpc: "2.0", result: { tools: [] } });
  };
  const client = new MeshixMcpClient({
    accessToken: "test-token",
    baseUrl: "https://meshix.example",
    fetchImpl,
  });
  assert.deepEqual(await client.listTools(), { tools: [] });
}

async function testToolCallResponseParsing() {
  const fetchImpl: typeof fetch = async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), {
      id: 1,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        arguments: { prompt: "make a clip" },
        name: "prepare_cad_request",
      },
    });
    return Response.json({
      id: 1,
      jsonrpc: "2.0",
      result: {
        content: [{ text: "Prepared Meshix request.", type: "text" }],
        structuredContent: {
          argument_skeleton: { prompt: "make a clip" },
          confidence: "high",
          missing_fields: [],
          next_action: "call_tool",
          ready: true,
          recommended_family: "general",
          recommended_tool: "create_3d_cad",
          routing_notes: [],
          safety_notes: [],
        },
      },
    });
  };
  const client = new MeshixMcpClient({
    accessToken: "test-token",
    baseUrl: "https://meshix.example",
    fetchImpl,
  });
  const prepared = await client.prepareCadRequest({ prompt: "make a clip" });
  assert.equal(prepared.ready, true);
  assert.equal(prepared.recommended_tool, "create_3d_cad");
}

function testRenderAssetSelection() {
  const assets: McpAsset[] = [
    {
      expires_hint: "refresh_with_get_design",
      filename: "model.stl",
      kind: "stl",
      label: "STL",
      mime_type: "model/stl",
      role: "mesh",
      url: "https://assets.example/model.stl",
    },
    {
      expires_hint: "refresh_with_get_design",
      filename: "bottom.png",
      kind: "render_bottom_png",
      label: "Bottom",
      mime_type: "image/png",
      role: "preview",
      url: "https://assets.example/bottom.png",
    },
    {
      expires_hint: "refresh_with_get_design",
      filename: "iso.png",
      kind: "render_isometric_png",
      label: "Isometric",
      mime_type: "image/png",
      role: "preview",
      url: "https://assets.example/iso.png",
    },
    {
      expires_hint: "refresh_with_get_design",
      filename: "top.png",
      kind: "render_top_png",
      label: "Top",
      mime_type: "image/png",
      role: "preview",
      url: "https://assets.example/top.png",
    },
  ];
  assert.deepEqual(
    selectRenderAssets(assets).map((asset) => asset.kind),
    ["render_isometric_png", "render_top_png", "render_bottom_png"]
  );
}

function testDesignContentCanHideSignedUrlsInUiMode() {
  const assets: McpAsset[] = [
    {
      expires_hint: "refresh_with_get_design",
      filename: "model.stl",
      kind: "stl",
      label: "STL",
      mime_type: "model/stl",
      role: "mesh",
      url: "https://assets.example/model.stl?signature=secret",
    },
    {
      expires_hint: "refresh_with_get_design",
      filename: "model.step",
      kind: "step",
      label: "STEP",
      mime_type: "model/step",
      role: "cad",
      url: "https://assets.example/model.step?signature=secret",
    },
  ];
  const content = buildDesignContent({
    assetsResult: {
      assets,
      design_id: "design_ready",
      latest_run: null,
      missing_kinds: [],
      status: "ready",
      studio_url: "https://meshix.example/studio/design/design_ready",
    },
    design: {
      design_id: "design_ready",
      latest_run: null,
      status: "ready",
      studio_url: "https://meshix.example/studio/design/design_ready",
      title: "Ready design",
    },
    includeAssetUrls: false,
    renderImages: [
      {
        asset: assets[0]!,
        image: { data: "iVBORw0KGgo=", mimeType: "image/png", type: "image" },
      },
    ],
  });
  assert.equal(content[0]?.type, "text");
  assert.match(content[0]?.type === "text" ? content[0].text : "", /Downloads: STL, STEP/);
  assert.doesNotMatch(content[0]?.type === "text" ? content[0].text : "", /signature=secret/);
  assert.equal(content.some((block) => block.type === "image"), true);
}

function testTerminalImageProtocolDetection() {
  assert.equal(normalizeImageProtocolOverride(undefined), undefined);
  assert.equal(normalizeImageProtocolOverride("auto"), undefined);
  assert.equal(normalizeImageProtocolOverride("kitty"), "kitty");
  assert.equal(normalizeImageProtocolOverride("iterm2"), "iterm2");
  assert.equal(normalizeImageProtocolOverride("off"), null);
  assert.equal(imageProtocolFromProcessNames(["/bin/zsh", "/Applications/Ghostty.app/Contents/MacOS/ghostty"]), "kitty");
  assert.equal(imageProtocolFromProcessNames(["/bin/zsh", "/Applications/iTerm.app/Contents/MacOS/iTerm2"]), "iterm2");
  assert.equal(
    imageProtocolFromProcessNames(["/bin/zsh", "/System/Applications/Utilities/Terminal.app/Contents/MacOS/Terminal"]),
    null
  );
}

function testTerminalDesignState() {
  assert.equal(
    isTerminalDesignState({
      artifacts: {
        plan_url: null,
        render_bottom_png_url: null,
        render_isometric_png_url: null,
        render_top_png_url: null,
        step_url: null,
        stl_url: null,
      },
      assets: [],
      available_asset_kinds: [],
      created_at: "2026-06-04T00:00:00.000Z",
      created_via: "mcp",
      design_id: "design_completed_but_not_ready",
      latest_run: {
        completed_at: "2026-06-04T00:01:00.000Z",
        current_iteration: null,
        failure_reason: null,
        job_id: null,
        max_iterations: null,
        progress_label: "Generation completed",
        run_id: "run_completed",
        started_at: "2026-06-04T00:00:00.000Z",
        status: "completed",
        updated_at: "2026-06-04T00:01:00.000Z",
      },
      missing_asset_kinds: [],
      pending_asset_kinds: [],
      selected_version: null,
      status: "generating",
      studio_url: "https://meshix.example/studio/design/design_completed_but_not_ready",
      title: "Completed run, generating design",
      updated_at: "2026-06-04T00:01:00.000Z",
    }),
    false
  );
  assert.equal(
    isTerminalDesignState({
      artifacts: {
        plan_url: null,
        render_bottom_png_url: null,
        render_isometric_png_url: null,
        render_top_png_url: null,
        step_url: null,
        stl_url: null,
      },
      assets: [],
      available_asset_kinds: [],
      created_at: "2026-06-04T00:00:00.000Z",
      created_via: "mcp",
      design_id: "design_ready",
      latest_run: null,
      missing_asset_kinds: [],
      pending_asset_kinds: [],
      selected_version: null,
      status: "ready",
      studio_url: "https://meshix.example/studio/design/design_ready",
      title: "Ready design",
      updated_at: "2026-06-04T00:01:00.000Z",
    }),
    true
  );
}

function testMissingFieldHandling() {
  const prompts = buildMissingFieldPrompts(
    [
      {
        field: "length_u",
        reason: "Gridfinity physical fit depends on explicit shell units; do not guess.",
        required_for: "create_3d_cad_gridfinity",
      },
      {
        field: "mount_side",
        reason: "Board Mount geometry depends on this explicit mounting choice.",
        required_for: "create_3d_cad_multiboard",
      },
      {
        field: "access_side",
        reason: "access_side must not equal mount_side.",
        required_for: "create_3d_cad_multiboard",
      },
    ],
    { install_orientation: "side_surface", mount_side: "left" }
  );
  assert.equal(prompts[0]?.kind, "input");
  assert.equal(prompts[0]?.field, "length_u");
  assert.deepEqual(
    prompts[1]?.kind === "select" ? prompts[1].options.map((option) => option.value) : [],
    ["left", "right"]
  );
  assert.deepEqual(
    prompts[2]?.kind === "select" ? prompts[2].options.map((option) => option.value) : [],
    ["front", "back", "right", "top", "bottom"]
  );
}

await testOAuthDiscoveryParsing();
await testJsonRpcRequestConstruction();
await testToolCallResponseParsing();
testRenderAssetSelection();
testDesignContentCanHideSignedUrlsInUiMode();
testTerminalImageProtocolDetection();
testTerminalDesignState();
testMissingFieldHandling();

console.log("Meshix Pi extension tests passed.");
