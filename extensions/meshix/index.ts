import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { ImageContent, TextContent } from "@earendil-works/pi-ai";
import { MeshixMcpClient, McpHttpError } from "./mcp-client.ts";
import { openExternalUrl, resolveMeshixAccessToken } from "./oauth.ts";
import {
  assetLabel,
  buildDesignContent,
  designStateLabel,
  isTerminalDesignState,
  loadRenderImages,
  selectDownloadAssets,
} from "./renderers.ts";
import {
  DOWNLOAD_ASSET_KINDS,
  MCP_CREATE_3D_CAD_TOOL,
  MCP_CREATE_3D_CAD_GRIDFINITY_TOOL,
  MCP_CREATE_3D_CAD_MULTIBOARD_TOOL,
  RENDER_ASSET_KINDS,
  type AccountStatusResult,
  type CreateToolName,
  type CreatedDesignResult,
  type DesignAssetsResult,
  type DesignListItem,
  type DesignStatusResult,
  type MissingField,
  type PrepareCadRequestResult,
  type RevisionResult,
} from "./types.ts";

const MESSAGE_TYPE = "meshix";
const POLL_ATTEMPTS = 80;
const POLL_INTERVAL_MS = 15_000;
const REQUESTED_ASSET_KINDS = [...RENDER_ASSET_KINDS, ...DOWNLOAD_ASSET_KINDS];

interface AuthedMcp {
  callTool<T>(name: string, args?: Record<string, unknown>): Promise<T>;
  client: MeshixMcpClient;
  getAccountStatus(): Promise<AccountStatusResult>;
  getDesign(designId: string): Promise<DesignStatusResult>;
  getDesignAssets(designId: string, kinds?: string[]): Promise<DesignAssetsResult>;
  initialize(): Promise<unknown>;
  listDesigns(args?: Record<string, unknown>): Promise<{ items: DesignListItem[]; scope: string }>;
  listTools(): Promise<{ tools: Array<{ description?: string; name: string }> }>;
  prepareCadRequest(args: Record<string, unknown>): Promise<PrepareCadRequestResult>;
  reviseDesign(args: Record<string, unknown>): Promise<RevisionResult>;
}

type MissingFieldPrompt =
  | {
      field: string;
      kind: "input";
      label: string;
      parse: (value: string) => number | string | undefined;
      placeholder: string;
      reason: string;
    }
  | {
      field: string;
      kind: "select";
      label: string;
      options: Array<{ label: string; value: boolean | string }>;
      reason: string;
    };

function textMessage(pi: ExtensionAPI, content: string, details?: unknown) {
  pi.sendMessage({
    content,
    customType: MESSAGE_TYPE,
    details,
    display: true,
  });
}

function contentMessage(pi: ExtensionAPI, content: Array<TextContent | ImageContent>, details?: unknown) {
  pi.sendMessage({
    content,
    customType: MESSAGE_TYPE,
    details,
    display: true,
  });
}

function isUnauthorizedError(error: unknown) {
  return error instanceof McpHttpError && error.status === 401;
}

async function createAuthenticatedMcp(allowInteractiveLogin: boolean, forceLogin = false): Promise<AuthedMcp> {
  let token = await resolveMeshixAccessToken({ allowInteractiveLogin, forceLogin });
  const client = new MeshixMcpClient({ accessToken: token.accessToken });

  async function withRefresh<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        throw error;
      }
      token = await resolveMeshixAccessToken({ allowInteractiveLogin: false, forceLogin: false });
      client.setAccessToken(token.accessToken);
      return await operation();
    }
  }

  return {
    callTool: async <T>(name: string, args?: Record<string, unknown>) => await withRefresh(() => client.callTool<T>(name, args)),
    client,
    getAccountStatus: async () => await withRefresh(() => client.getAccountStatus()),
    getDesign: async (designId: string) => await withRefresh(() => client.getDesign(designId)),
    getDesignAssets: async (designId: string, kinds?: string[]) =>
      await withRefresh(() => client.getDesignAssets(designId, kinds)),
    initialize: async () => await withRefresh(() => client.initialize()),
    listDesigns: async (args?: Record<string, unknown>) => await withRefresh(() => client.listDesigns(args)),
    listTools: async () => await withRefresh(() => client.listTools()),
    prepareCadRequest: async (args: Record<string, unknown>) => await withRefresh(() => client.prepareCadRequest(args)),
    reviseDesign: async (args: Record<string, unknown>) => await withRefresh(() => client.reviseDesign(args)),
  };
}

function parsePositiveInteger(value: string) {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function booleanOptions() {
  return [
    { label: "No", value: false },
    { label: "Yes", value: true },
  ];
}

function options(values: string[]) {
  return values.map((value) => ({ label: value, value }));
}

export function buildMissingFieldPrompts(
  missingFields: MissingField[],
  currentArgs: Record<string, unknown> = {}
): MissingFieldPrompt[] {
  return missingFields.map((missing) => {
    const reason = missing.reason;
    if (missing.field === "length_u" || missing.field === "width_u" || missing.field === "height_u") {
      return {
        field: missing.field,
        kind: "input",
        label: `${missing.field} (positive whole number)`,
        parse: parsePositiveInteger,
        placeholder: "1",
        reason,
      };
    }
    if (missing.field === "install_orientation") {
      return {
        field: missing.field,
        kind: "select",
        label: "Install orientation",
        options: options(["wall", "under_surface", "side_surface"]),
        reason,
      };
    }
    if (missing.field === "mount_side") {
      const installOrientation = currentArgs.install_orientation;
      const allowed =
        installOrientation === "wall"
          ? ["back"]
          : installOrientation === "under_surface"
            ? ["top"]
            : installOrientation === "side_surface"
              ? ["left", "right"]
              : ["back", "top", "left", "right"];
      return {
        field: missing.field,
        kind: "select",
        label: "Mount side",
        options: options(allowed),
        reason,
      };
    }
    if (missing.field === "access_side") {
      const mountSide = currentArgs.mount_side;
      const allowed = ["front", "back", "left", "right", "top", "bottom"].filter((side) => side !== mountSide);
      return {
        field: missing.field,
        kind: "select",
        label: "Access side",
        options: options(allowed),
        reason,
      };
    }
    if (missing.field === "connector_layout") {
      return {
        field: missing.field,
        kind: "select",
        label: "Connector layout",
        options: options([
          "auto",
          "single_center",
          "pair_horizontal",
          "pair_vertical",
          "pair_connected_horizontal",
          "pair_connected_vertical",
          "triple_horizontal",
          "quad_2x2",
          "quad_spaced_2x2",
        ]),
        reason,
      };
    }
    if (missing.field === "connector_security") {
      return {
        field: missing.field,
        kind: "select",
        label: "Connector security",
        options: options(["standard", "secure", "extra_secure"]),
        reason,
      };
    }
    if (missing.field === "connector_pad_mode") {
      return {
        field: missing.field,
        kind: "select",
        label: "Connector pad mode",
        options: options(["auto", "none", "pad", "standoff"]),
        reason,
      };
    }
    if (
      missing.field === "front_access_relief" ||
      missing.field === "separate_insert" ||
      missing.field === "include_ghost_board_debug_model"
    ) {
      return {
        field: missing.field,
        kind: "select",
        label: missing.field,
        options: booleanOptions(),
        reason,
      };
    }
    return {
      field: missing.field,
      kind: "input",
      label: missing.field,
      parse: (value) => value.trim() || undefined,
      placeholder: missing.field,
      reason,
    };
  });
}

async function askForMissingFields(
  ctx: ExtensionCommandContext,
  missingFields: MissingField[],
  currentArgs: Record<string, unknown>
) {
  const answers: Record<string, unknown> = {};
  for (const prompt of buildMissingFieldPrompts(missingFields, currentArgs)) {
    if (prompt.kind === "select") {
      const labels = prompt.options.map((option) => option.label);
      const selected = await ctx.ui.select(`Meshix: ${prompt.label}`, labels);
      if (!selected) {
        return null;
      }
      const selectedOption = prompt.options.find((option) => option.label === selected);
      answers[prompt.field] = selectedOption?.value ?? selected;
      currentArgs[prompt.field] = answers[prompt.field];
      continue;
    }

    while (true) {
      const value = await ctx.ui.input(`Meshix: ${prompt.label}`, prompt.placeholder);
      if (value === undefined) {
        return null;
      }
      const parsed = prompt.parse(value);
      if (parsed !== undefined) {
        answers[prompt.field] = parsed;
        currentArgs[prompt.field] = parsed;
        break;
      }
      ctx.ui.notify(`${prompt.field} needs a valid value.`, "warning");
    }
  }
  return answers;
}

function createToolFromRecommendation(recommendedTool: string | null): CreateToolName {
  if (
    recommendedTool === MCP_CREATE_3D_CAD_TOOL ||
    recommendedTool === MCP_CREATE_3D_CAD_GRIDFINITY_TOOL ||
    recommendedTool === MCP_CREATE_3D_CAD_MULTIBOARD_TOOL
  ) {
    return recommendedTool;
  }
  return MCP_CREATE_3D_CAD_TOOL;
}

async function prepareWithClarification(
  mcp: AuthedMcp,
  ctx: ExtensionCommandContext,
  args: Record<string, unknown>
) {
  let currentArgs = { ...args };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prepared = await mcp.prepareCadRequest(currentArgs);
    currentArgs = { ...currentArgs, ...prepared.argument_skeleton };
    if (prepared.ready) {
      return { args: currentArgs, prepared };
    }
    if (!ctx.hasUI) {
      throw new Error(
        `Meshix needs more information before generation: ${prepared.missing_fields
          .map((field) => field.field)
          .join(", ")}`
      );
    }
    const answers = await askForMissingFields(ctx, prepared.missing_fields, currentArgs);
    if (!answers) {
      return null;
    }
    currentArgs = { ...currentArgs, ...answers };
  }
  throw new Error("Meshix still needs clarification after three passes.");
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollDesign(mcp: AuthedMcp, ctx: ExtensionCommandContext, designId: string) {
  let latest: DesignStatusResult | null = null;
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    latest = await mcp.getDesign(designId);
    ctx.ui.setStatus("meshix", `${designId}: ${designStateLabel(latest)}`);
    if (isTerminalDesignState(latest)) {
      return latest;
    }
    if (attempt < POLL_ATTEMPTS - 1) {
      await sleep(POLL_INTERVAL_MS);
    }
  }
  throw new Error(
    `Meshix design ${designId} did not reach a terminal state after ${POLL_ATTEMPTS} polls. Latest status: ${
      latest ? designStateLabel(latest) : "unknown"
    }.`
  );
}

async function displayDesign(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  mcp: AuthedMcp,
  design: DesignStatusResult,
  heading = "Meshix Design"
) {
  const assets = await mcp.getDesignAssets(design.design_id, REQUESTED_ASSET_KINDS);
  const { failures, images } = await loadRenderImages(assets.assets);
  contentMessage(
    pi,
    buildDesignContent({
      assetsResult: assets,
      design,
      heading,
      renderImages: images,
    }),
    {
      assets,
      design_id: design.design_id,
      status: design.status,
    }
  );
  if (failures.length) {
    ctx.ui.notify(`Some render images could not be loaded: ${failures.join("; ")}`, "warning");
  }
  return assets;
}

function formatStatusMessage(status: AccountStatusResult, tools: string[]) {
  const account = status.account?.displayLabel || status.account?.email || status.account?.id || "unknown Meshix account";
  const capabilityTools = status.capabilities?.tools;
  const listedTools = tools.length ? tools : Array.isArray(capabilityTools) ? capabilityTools : [];
  return [
    "Meshix Status",
    "",
    `Signed in as: ${account}`,
    listedTools.length ? `Available MCP tools: ${listedTools.join(", ")}` : "Available MCP tools: none reported",
  ].join("\n");
}

async function handleLogin(pi: ExtensionAPI, ctx: ExtensionCommandContext) {
  ctx.ui.setStatus("meshix", "logging in");
  try {
    const token = await resolveMeshixAccessToken({
      allowInteractiveLogin: true,
      forceLogin: true,
      onAuthorizationUrl: (url) => {
        ctx.ui.notify("Opening Meshix login in your browser.", "info");
        textMessage(pi, `Meshix login URL:\n${url}`);
      },
    });
    const mcp = await createAuthenticatedMcp(false);
    await mcp.initialize();
    const status = await mcp.getAccountStatus();
    textMessage(pi, `Meshix login complete.\nToken source: ${token.source}\nState: ${token.storeDescription}\n\n${formatStatusMessage(status, [])}`);
  } finally {
    ctx.ui.setStatus("meshix", undefined);
  }
}

async function handleStatus(pi: ExtensionAPI, ctx: ExtensionCommandContext) {
  const mcp = await createAuthenticatedMcp(false);
  await mcp.initialize();
  const [status, toolsResult] = await Promise.all([mcp.getAccountStatus(), mcp.listTools()]);
  textMessage(
    pi,
    formatStatusMessage(
      status,
      toolsResult.tools.map((tool) => tool.name)
    ),
    { status, tools: toolsResult.tools }
  );
}

async function handleMeshix(pi: ExtensionAPI, ctx: ExtensionCommandContext, prompt: string) {
  if (!prompt.trim()) {
    ctx.ui.notify("Usage: /meshix <CAD prompt>", "warning");
    return;
  }

  const mcp = await createAuthenticatedMcp(false);
  await mcp.initialize();
  ctx.ui.setStatus("meshix", "preparing request");
  try {
    const prepared = await prepareWithClarification(mcp, ctx, { prompt: prompt.trim() });
    if (!prepared) {
      ctx.ui.notify("Meshix generation cancelled.", "info");
      return;
    }
    const tool = createToolFromRecommendation(prepared.prepared.recommended_tool);
    ctx.ui.setStatus("meshix", `queueing ${tool}`);
    const created = await mcp.callTool<CreatedDesignResult>(tool, prepared.args);
    textMessage(pi, `Queued Meshix design ${created.design_id} with ${tool}.\nStudio: ${created.studio_url}`);
    const design = await pollDesign(mcp, ctx, created.design_id);
    const assets = await displayDesign(pi, ctx, mcp, design, "Meshix Generated Design");
    await offerDesignActions(pi, ctx, mcp, design, assets);
  } finally {
    ctx.ui.setStatus("meshix", undefined);
  }
}

async function handleDesigns(pi: ExtensionAPI, ctx: ExtensionCommandContext) {
  const mcp = await createAuthenticatedMcp(false);
  await mcp.initialize();
  const list = await mcp.listDesigns({ limit: 10, scope: "mine" });
  if (list.items.length === 0) {
    textMessage(pi, "No owned Meshix designs were returned.");
    return;
  }
  if (!ctx.hasUI) {
    textMessage(
      pi,
      [
        "Owned Meshix designs:",
        "",
        ...list.items.map((item) => `- ${item.title || item.design_id} [${item.status}] ${item.studio_url}`),
      ].join("\n"),
      list
    );
    return;
  }

  const labels = list.items.map((item, index) => {
    const title = item.title || item.design_id;
    return `${index + 1}. ${title} [${item.status}]`;
  });
  const selected = await ctx.ui.select("Meshix designs", labels);
  if (!selected) {
    return;
  }
  const selectedIndex = labels.indexOf(selected);
  const item = list.items[selectedIndex];
  if (!item) {
    return;
  }
  const design = await mcp.getDesign(item.design_id);
  const assets = await displayDesign(pi, ctx, mcp, design, "Meshix Selected Design");
  await offerDesignActions(pi, ctx, mcp, design, assets);
}

async function reviseDesign(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  mcp: AuthedMcp,
  design: DesignStatusResult
) {
  const revisionPrompt = await ctx.ui.input("Revise Meshix design", "Describe the change to make");
  if (!revisionPrompt?.trim()) {
    return null;
  }
  const revisionArgs: Record<string, unknown> = {
    design_id: design.design_id,
    revision_prompt: revisionPrompt.trim(),
  };
  if (design.latest_run?.run_id) {
    revisionArgs.run_id = design.latest_run.run_id;
  }
  if (design.selected_version?.version_id) {
    revisionArgs.version_id = design.selected_version.version_id;
  }
  ctx.ui.setStatus("meshix", "queueing revision");
  const revised = await mcp.reviseDesign(revisionArgs);
  textMessage(pi, `Queued Meshix revision ${revised.run_id} for ${revised.design_id}.\nStudio: ${revised.studio_url}`);
  const revisedDesign = await pollDesign(mcp, ctx, revised.design_id);
  const revisedAssets = await displayDesign(pi, ctx, mcp, revisedDesign, "Meshix Revised Design");
  return { assets: revisedAssets, design: revisedDesign };
}

async function offerDesignActions(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  mcp: AuthedMcp,
  initialDesign: DesignStatusResult,
  initialAssets: DesignAssetsResult
) {
  if (!ctx.hasUI) {
    return;
  }
  let design = initialDesign;
  let assets = initialAssets;
  while (true) {
    const downloads = selectDownloadAssets(assets.assets);
    const actions = [
      "Revise design",
      "Open Studio",
      ...downloads.map((asset) => `Open ${assetLabel(asset.kind)} download`),
      "Done",
    ];
    const selected = await ctx.ui.select("Meshix next action", actions);
    if (!selected || selected === "Done") {
      return;
    }
    if (selected === "Open Studio") {
      const opened = await openExternalUrl(design.studio_url || assets.studio_url);
      ctx.ui.notify(opened ? "Opened Meshix Studio." : design.studio_url || assets.studio_url, opened ? "info" : "warning");
      continue;
    }
    if (selected === "Revise design") {
      const revised = await reviseDesign(pi, ctx, mcp, design);
      if (revised) {
        design = revised.design;
        assets = revised.assets;
      }
      continue;
    }
    const asset = downloads.find((candidate) => selected === `Open ${assetLabel(candidate.kind)} download`);
    if (asset) {
      const opened = await openExternalUrl(asset.url);
      ctx.ui.notify(opened ? `Opened ${assetLabel(asset.kind)} download.` : asset.url, opened ? "info" : "warning");
    }
  }
}

function withCommandErrors(
  ctx: ExtensionCommandContext,
  handler: () => Promise<void>
) {
  return handler().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    ctx.ui.notify(message, "error");
  });
}

export default function meshixPiExtension(pi: ExtensionAPI) {
  pi.registerCommand("meshix-login", {
    description: "Sign in to Meshix MCP with OAuth",
    handler: async (_args, ctx) => {
      await withCommandErrors(ctx, async () => await handleLogin(pi, ctx));
    },
  });

  pi.registerCommand("meshix-status", {
    description: "Show Meshix account and MCP tool status",
    handler: async (_args, ctx) => {
      await withCommandErrors(ctx, async () => await handleStatus(pi, ctx));
    },
  });

  pi.registerCommand("meshix", {
    description: "Generate a Meshix CAD design from a prompt",
    handler: async (args, ctx) => {
      await withCommandErrors(ctx, async () => await handleMeshix(pi, ctx, args));
    },
  });

  pi.registerCommand("meshix-designs", {
    description: "List and inspect owned Meshix designs",
    handler: async (_args, ctx) => {
      await withCommandErrors(ctx, async () => await handleDesigns(pi, ctx));
    },
  });
}
