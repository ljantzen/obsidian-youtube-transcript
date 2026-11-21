import { App, TFile } from "obsidian";

/**
 * Opens a vault file by its exact path. Unlike `workspace.openLinkText()`,
 * this never interprets "#" or "^" in the path as a heading/block-reference
 * separator, which otherwise silently opens (or creates) the wrong note for
 * video titles containing those characters (e.g. "My Video #1").
 *
 * Falls back to `openLinkText()` if the file can't be found at that exact
 * path, so callers keep working even if a caller ever passes a path that
 * still needs link-style resolution.
 */
export async function openVaultFile(
  app: App,
  path: string,
  newLeaf = false,
): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (file instanceof TFile) {
    await app.workspace.getLeaf(newLeaf).openFile(file);
    return;
  }
  await app.workspace.openLinkText(path, "", newLeaf);
}
