import { describe, it, expect, vi } from "vitest";
import type { App, TFile } from "obsidian";
import { TFile as TFileClass } from "obsidian";
import { openVaultFile } from "../src/utils/vaultFileOpen";

// Builds an object that is `instanceof TFile` (what openVaultFile checks)
// without calling `new TFile(...)`, whose real constructor (unlike the test
// mock's) takes no arguments.
function makeTFile(path: string): TFile {
  return Object.assign(Object.create(TFileClass.prototype), { path }) as TFile;
}

// Regression coverage for a bug where video titles containing "#" (e.g.
// "I'm a Book Editor. This Is the #1 Character Mistake I See.") caused the
// created note to open (or even create) the wrong file: openLinkText()
// parses "#" in its linktext argument as a heading/block-reference
// separator, so "<title> #1 ....md" resolved to the note "<title>" plus a
// heading reference, silently opening a different, empty note instead of
// the one that was actually created on disk.
describe("openVaultFile", () => {
  function makeApp(file: TFile | null) {
    const openFile = vi.fn().mockResolvedValue(undefined);
    const getLeaf = vi.fn().mockReturnValue({ openFile });
    const openLinkText = vi.fn().mockResolvedValue(undefined);
    const app = {
      vault: {
        getAbstractFileByPath: vi.fn().mockReturnValue(file),
      },
      workspace: {
        getLeaf,
        openLinkText,
      },
    } as unknown as App;
    return { app, openFile, getLeaf, openLinkText };
  }

  it("opens the exact file by path, not by link-text resolution, even when the path contains '#'", async () => {
    const path = "Transcripts/I'm a Book Editor. This Is the #1 Character Mistake I See..md";
    const file = makeTFile(path);
    const { app, openFile, getLeaf, openLinkText } = makeApp(file);

    await openVaultFile(app, path);

    expect(app.vault.getAbstractFileByPath).toHaveBeenCalledWith(path);
    expect(getLeaf).toHaveBeenCalledWith(false);
    expect(openFile).toHaveBeenCalledWith(file);
    expect(openLinkText).not.toHaveBeenCalled();
  });

  it("opens in a new leaf when requested", async () => {
    const path = "Notes/Plain Title.md";
    const file = makeTFile(path);
    const { app, getLeaf } = makeApp(file);

    await openVaultFile(app, path, true);

    expect(getLeaf).toHaveBeenCalledWith(true);
  });

  it("falls back to openLinkText when no file exists at the exact path", async () => {
    const path = "Notes/Missing.md";
    const { app, openFile, openLinkText } = makeApp(null);

    await openVaultFile(app, path);

    expect(openLinkText).toHaveBeenCalledWith(path, "", false);
    expect(openFile).not.toHaveBeenCalled();
  });
});
