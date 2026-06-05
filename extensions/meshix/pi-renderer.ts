import type { ImageContent, TextContent } from "@earendil-works/pi-ai";
import type { ExtensionAPI, MessageRenderer } from "@earendil-works/pi-coding-agent";
import { execFileSync } from "node:child_process";

type TuiModule = typeof import("@earendil-works/pi-tui");
type MeshixImageProtocol = "kitty" | "iterm2";

interface MeshixTuiModule {
  Container: TuiModule["Container"];
  Image: TuiModule["Image"];
  Spacer: TuiModule["Spacer"];
  Text: TuiModule["Text"];
  getCapabilities: TuiModule["getCapabilities"];
  setCapabilities: TuiModule["setCapabilities"];
}

export function normalizeImageProtocolOverride(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "auto") {
    return undefined;
  }
  if (normalized === "kitty" || normalized === "iterm2") {
    return normalized;
  }
  if (normalized === "none" || normalized === "off" || normalized === "false") {
    return null;
  }
  return undefined;
}

export function imageProtocolFromProcessNames(names: string[]): MeshixImageProtocol | null {
  for (const name of names) {
    const normalized = name.toLowerCase();
    if (normalized.includes("ghostty") || normalized.includes("kitty") || normalized.includes("wezterm")) {
      return "kitty";
    }
    if (normalized.includes("iterm")) {
      return "iterm2";
    }
    if (normalized.includes("terminal.app") || normalized.endsWith("/terminal") || normalized === "terminal") {
      return null;
    }
  }
  return null;
}

function processAncestryNames(limit = 8) {
  const names: string[] = [];
  let pid = process.ppid;
  for (let depth = 0; pid > 1 && depth < limit; depth += 1) {
    try {
      const output = execFileSync("ps", ["-p", String(pid), "-o", "ppid=", "-o", "comm="], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      const match = output.match(/^(\d+)\s+(.+)$/u);
      if (!match) {
        break;
      }
      pid = Number(match[1]);
      names.push(match[2]);
    } catch {
      break;
    }
  }
  return names;
}

function configureImageProtocol(tui: MeshixTuiModule) {
  const override = normalizeImageProtocolOverride(process.env.MESHIX_PI_IMAGE_PROTOCOL);
  const current = tui.getCapabilities();
  if (override === null) {
    tui.setCapabilities({ ...current, images: null });
    return;
  }
  if (override) {
    tui.setCapabilities({ images: override, trueColor: true, hyperlinks: current.hyperlinks });
    return;
  }
  if (current.images) {
    return;
  }
  const inferred = imageProtocolFromProcessNames(processAncestryNames());
  if (inferred) {
    tui.setCapabilities({ images: inferred, trueColor: true, hyperlinks: current.hyperlinks });
  }
}

function textBlocks(content: string | Array<TextContent | ImageContent>) {
  if (typeof content === "string") {
    return content;
  }
  return content
    .filter((block): block is TextContent => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

function imageBlocks(content: string | Array<TextContent | ImageContent>) {
  if (typeof content === "string") {
    return [];
  }
  return content.filter((block): block is ImageContent => block.type === "image");
}

function buildMeshixMessageRenderer(tui: MeshixTuiModule): MessageRenderer {
  return (message, _options, theme) => {
    const container = new tui.Container();
    container.addChild(new tui.Spacer(1));
    container.addChild(new tui.Text(theme.fg("customMessageLabel", "[meshix]"), 0, 0));
    container.addChild(new tui.Text(theme.fg("customMessageText", textBlocks(message.content)), 0, 0));

    const images = imageBlocks(message.content);
    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      container.addChild(new tui.Spacer(1));
      container.addChild(
        new tui.Image(
          image.data,
          image.mimeType,
          {
            fallbackColor: (text) => theme.fg("muted", text),
          },
          {
            filename: `meshix-render-${index + 1}.png`,
            maxHeightCells: 14,
            maxWidthCells: 48,
          }
        )
      );
    }

    return container;
  };
}

export async function registerMeshixMessageRenderer(pi: ExtensionAPI) {
  try {
    const tui = (await import("@earendil-works/pi-tui")) as MeshixTuiModule;
    configureImageProtocol(tui);
    pi.registerMessageRenderer("meshix", buildMeshixMessageRenderer(tui));
  } catch {
    // Older Pi installs may not expose pi-tui to extensions. The default text
    // renderer still shows the design summary and action menu in that case.
  }
}
