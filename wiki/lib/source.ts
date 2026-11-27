import { loader } from "fumadocs-core/source";
import { obsidian } from "fumadocs-obsidian";
import path from "node:path";
import { docsRoute } from "./shared";

const vault = obsidian({
  dir: path.join(process.cwd(), "content", "docs"),

  remarkImageOptions: false,

  // Obsidian wikilinks resolve media files to their vault path. Encode each
  // segment separately so spaces, accents and characters such as `#` remain
  // part of the filename instead of becoming URL syntax.
  url: (vaultPath) =>
    `/api/obsidian/${vaultPath
      .replaceAll("\\", "/")
      .split("/")
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join("/")}`,
});

const vaultSource = await vault.staticSource();

export const source = loader(vaultSource, {
  baseUrl: docsRoute,
});
