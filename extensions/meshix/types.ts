export const MESHIX_BASE_URL = "https://meshix.app";
export const MESHIX_MCP_RESOURCE = "https://meshix.app/mcp";
export const MESHIX_MCP_PROTOCOL_VERSION = "2025-06-18";

export const MCP_PREPARE_CAD_REQUEST_TOOL = "prepare_cad_request";
export const MCP_CREATE_3D_CAD_TOOL = "create_3d_cad";
export const MCP_CREATE_3D_CAD_GRIDFINITY_TOOL = "create_3d_cad_gridfinity";
export const MCP_CREATE_3D_CAD_MULTIBOARD_TOOL = "create_3d_cad_multiboard";
export const MCP_LIST_DESIGNS_TOOL = "list_designs";
export const MCP_REVISE_DESIGN_TOOL = "revise_design";
export const MCP_GET_ACCOUNT_STATUS_TOOL = "get_account_status";
export const MCP_GET_DESIGN_TOOL = "get_design";
export const MCP_GET_DESIGN_ASSETS_TOOL = "get_design_assets";

export const CREATE_TOOL_NAMES = [
  MCP_CREATE_3D_CAD_TOOL,
  MCP_CREATE_3D_CAD_GRIDFINITY_TOOL,
  MCP_CREATE_3D_CAD_MULTIBOARD_TOOL,
] as const;

export const RENDER_ASSET_KINDS = [
  "render_isometric_png",
  "render_top_png",
  "render_bottom_png",
] as const;

export const DOWNLOAD_ASSET_KINDS = ["stl", "step", "plan"] as const;

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  id: JsonRpcId;
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse<TResult> {
  error?: {
    code: number;
    data?: unknown;
    message: string;
  };
  id: JsonRpcId;
  jsonrpc: "2.0";
  result?: TResult;
}

export interface McpToolCallResult<TStructuredContent> {
  content?: Array<{ text: string; type: "text" } | { data: string; mimeType: string; type: "image" }>;
  isError?: boolean;
  structuredContent?: TStructuredContent;
}

export type CreateToolName = (typeof CREATE_TOOL_NAMES)[number];
export type RenderAssetKind = (typeof RENDER_ASSET_KINDS)[number];
export type DownloadAssetKind = (typeof DOWNLOAD_ASSET_KINDS)[number];
export type AssetKind = RenderAssetKind | DownloadAssetKind;

export interface MissingField {
  field: string;
  reason: string;
  required_for: string;
}

export interface PrepareCadRequestResult {
  argument_skeleton: Record<string, unknown>;
  confidence: "high" | "medium" | "low" | string;
  missing_fields: MissingField[];
  next_action: string;
  ready: boolean;
  recommended_family: string;
  recommended_tool: CreateToolName | string | null;
  routing_notes: string[];
  safety_notes: string[];
}

export interface CreatedDesignResult {
  design_id: string;
  flow_kind?: string;
  generation_input_id?: string;
  job_id: string | null;
  run_id: string;
  status: string;
  studio_url: string;
}

export interface RevisionResult extends CreatedDesignResult {
  action?: "revision_queued";
  parent_design_id?: string;
  parent_run_id?: string;
  parent_version_id?: string;
}

export interface McpAsset {
  expires_hint?: string;
  filename: string;
  kind: AssetKind | string;
  label: string;
  mime_type: string;
  role: string;
  url: string;
}

export interface LatestRun {
  completed_at?: string | null;
  current_iteration?: number | null;
  failure_reason?: string | null;
  job_id?: string | null;
  max_iterations?: number | null;
  progress_label?: string | null;
  run_id: string;
  started_at?: string;
  status: string;
  updated_at: string;
}

export interface DesignStatusResult {
  artifacts?: {
    plan_url?: string | null;
    render_bottom_png_url?: string | null;
    render_isometric_png_url?: string | null;
    render_top_png_url?: string | null;
    step_url?: string | null;
    stl_url?: string | null;
  };
  assets?: McpAsset[];
  available_asset_kinds?: string[];
  created_at?: string;
  created_via?: string;
  design_id: string;
  latest_run: LatestRun | null;
  missing_asset_kinds?: string[];
  pending_asset_kinds?: string[];
  selected_version?: {
    completed_at?: string | null;
    ordinal?: number;
    summary?: string | null;
    version_id: string;
  } | null;
  status: string;
  studio_url: string;
  title?: string | null;
  updated_at?: string;
}

export interface DesignAssetsResult {
  assets: McpAsset[];
  design_id: string;
  latest_run: Pick<LatestRun, "progress_label" | "run_id" | "status" | "updated_at"> | null;
  missing_kinds: string[];
  status: string;
  studio_url: string;
}

export interface DesignListItem {
  asset_kinds?: string[];
  created_at?: string;
  created_via?: string;
  design_id: string;
  flow_kind?: string;
  latest_run?: {
    progress_label?: string | null;
    run_id: string;
    status: string;
    updated_at: string;
  } | null;
  render_isometric_png_url?: string | null;
  selected_version?: {
    completed_at?: string | null;
    ordinal?: number;
    summary?: string | null;
    version_id: string;
  } | null;
  status: string;
  studio_url: string;
  thumbnail_url?: string | null;
  title?: string | null;
  updated_at?: string;
}

export interface DesignListResult {
  items: DesignListItem[];
  next_cursor?: string | null;
  scope: "mine" | "public" | string;
}

export interface AccountStatusResult {
  account?: {
    displayLabel?: string;
    email?: string | null;
    id?: string;
    name?: string | null;
  };
  capabilities?: {
    tools?: string[];
    [key: string]: unknown;
  };
  generation_access?: unknown;
  usage?: unknown;
  [key: string]: unknown;
}

export interface OAuthServerMetadata {
  authorization_endpoint: string;
  code_challenge_methods_supported?: string[];
  grant_types_supported?: string[];
  issuer: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  token_endpoint: string;
  token_endpoint_auth_methods_supported?: string[];
}

export interface ProtectedResourceMetadata {
  authorization_servers: string[];
  bearer_methods_supported?: string[];
  resource: string;
  resource_name?: string;
}

export interface DynamicClientRegistration {
  client_id: string;
  client_id_issued_at?: number;
  client_name?: string;
  grant_types?: string[];
  redirect_uris?: string[];
  response_types?: string[];
  scope?: string;
  token_endpoint_auth_method?: string;
}

export interface TokenSet {
  access_token: string;
  expires_at: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type: string;
}

export interface TokenEndpointResponse {
  access_token: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

export interface StoredMeshixOAuthSession {
  authorizationServer: OAuthServerMetadata;
  baseUrl: string;
  client: DynamicClientRegistration;
  resource: string;
  tokens?: TokenSet;
  updatedAt: string;
  version: 1;
}
