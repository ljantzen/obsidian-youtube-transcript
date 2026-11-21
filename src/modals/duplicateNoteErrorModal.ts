import { App, Modal, TFile } from "obsidian";

export class DuplicateNoteErrorModal extends Modal {
  existingNote: TFile;

  constructor(app: App, existingNote: TFile) {
    super(app);
    this.existingNote = existingNote;
  }

  onOpen() {
    const { contentEl } = this;
    const noteName = this.existingNote.path.replace(/\.md$/, "");

    contentEl.createEl("h2", {
      text: "Duplicate note detected",
      attr: { style: "color: var(--text-error);" },
    });

    contentEl.createEl("p", {
      text: "A transcript for this video already exists in your vault.",
      attr: { style: "margin-bottom: 1em;" },
    });

    const noteContainer = contentEl.createDiv({
      attr: {
        style:
          "background: var(--background-secondary); padding: 0.75em; border-radius: 4px; margin-bottom: 1em; word-break: break-all;",
      },
    });
    noteContainer.createEl("strong", { text: "Existing note: " });
    const link = noteContainer.createEl("a", {
      text: noteName,
      cls: "internal-link",
      attr: { "data-href": noteName, href: noteName },
    });
    link.addEventListener("click", (e) => {
      e.preventDefault();
      void this.app.workspace.getLeaf(false).openFile(this.existingNote);
      this.close();
    });

    contentEl.createEl("p", {
      text: "No transcript was fetched. You can open the existing note or try with a different video.",
      attr: { style: "color: var(--text-muted); font-size: 0.9em;" },
    });

    const buttonContainer = contentEl.createDiv({
      attr: { style: "text-align: right; margin-top: 1.5em;" },
    });

    const okButton = buttonContainer.createEl("button", {
      text: "OK",
      cls: "mod-cta",
    });
    okButton.addEventListener("click", () => this.close());
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
