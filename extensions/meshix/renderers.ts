import type { ImageContent, TextContent } from "@earendil-works/pi-ai";
import {
  DOWNLOAD_ASSET_KINDS,
  RENDER_ASSET_KINDS,
  type DesignAssetsResult,
  type DesignStatusResult,
  type McpAsset,
} from "./types.ts";

const MAX_INLINE_IMAGE_BYTES = 4 * 1024 * 1024;

export interface LoadedRenderImage {
  asset: McpAsset;
  image: ImageContent;
}

export function assetLabel(kind: string) {
  const labels: Record<string, string> = {
    plan: "Plan",
    render_bottom_png: "Bottom render",
    render_isometric_png: "Isometric render",
    render_top_png: "Top render",
    step: "STEP",
    stl: "STL",
  };
  return labels[kind] ?? kind;
}

export function selectRenderAssets(assets: McpAsset[]) {
  return RENDER_ASSET_KINDS.map((kind) => assets.find((asset) => asset.kind === kind)).filter(
    (asset): asset is McpAsset => Boolean(asset)
  );
}

export function selectDownloadAssets(assets: McpAsset[]) {
  return DOWNLOAD_ASSET_KINDS.map((kind) => assets.find((asset) => asset.kind === kind)).filter(
    (asset): asset is McpAsset => Boolean(asset)
  );
}

function bufferToBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

export async function imageContentFromAsset(asset: McpAsset, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(asset.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${assetLabel(asset.kind)} image: HTTP ${response.status}`);
  }
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_INLINE_IMAGE_BYTES) {
    throw new Error(`${assetLabel(asset.kind)} image is too large to display inline.`);
  }
  const mimeType = response.headers.get("content-type") ?? asset.mime_type ?? "image/png";
  if (!mimeType.startsWith("image/")) {
    throw new Error(`${assetLabel(asset.kind)} is not an image asset.`);
  }
  return {
    data: bufferToBase64(await response.arrayBuffer()),
    mimeType,
    type: "image",
  } satisfies ImageContent;
}

export async function loadRenderImages(assets: McpAsset[], fetchImpl: typeof fetch = fetch) {
  const images: LoadedRenderImage[] = [];
  const failures: string[] = [];
  for (const asset of selectRenderAssets(assets)) {
    try {
      images.push({ asset, image: await imageContentFromAsset(asset, fetchImpl) });
    } catch (error) {
      failures.push(`${assetLabel(asset.kind)}: ${String(error)}`);
    }
  }
  return { failures, images };
}

export function designStateLabel(design: DesignStatusResult) {
  const run = design.latest_run;
  const runLabel = run?.progress_label ? ` (${run.progress_label})` : "";
  return run ? `${design.status}; run ${run.status}${runLabel}` : design.status;
}

export function isTerminalDesignState(design: DesignStatusResult) {
  if (design.status === "ready" || design.status === "needs_attention" || design.status === "archived") {
    return true;
  }
  if (design.latest_run?.status === "error") {
    return true;
  }
  return false;
}

export function formatAssetLinks(assets: McpAsset[]) {
  if (assets.length === 0) {
    return "No asset links are currently available.";
  }
  return assets.map((asset) => `- ${assetLabel(asset.kind)}: ${asset.url}`).join("\n");
}

export function buildDesignContent({
  assetsResult,
  design,
  heading = "Meshix Design",
  renderImages,
}: {
  assetsResult: DesignAssetsResult;
  design: DesignStatusResult;
  heading?: string;
  renderImages: LoadedRenderImage[];
}): Array<TextContent | ImageContent> {
  const downloads = selectDownloadAssets(assetsResult.assets);
  const text = [
    heading,
    "",
    `Title: ${design.title || design.design_id}`,
    `Design: ${design.design_id}`,
    `Status: ${designStateLabel(design)}`,
    `Studio: ${design.studio_url || assetsResult.studio_url}`,
    "",
    "Asset links:",
    formatAssetLinks(downloads.length ? downloads : assetsResult.assets),
  ].join("\n");

  const content: Array<TextContent | ImageContent> = [{ text, type: "text" }];
  for (const { asset, image } of renderImages) {
    content.push({ text: assetLabel(asset.kind), type: "text" });
    content.push(image);
  }
  return content;
}
