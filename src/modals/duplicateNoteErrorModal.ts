import { App, Modal } from "obsidian";

export class DuplicateNoteErrorModal extends Modal {
  noteName: string;

  constructor(app: App, noteName: string) {
    super(app);
    this.noteName = noteName;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", {
      text: "Duplicate Note Detected",
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
    noteContainer.createEl("code", { text: this.noteName });

    contentEl.createEl("p", {
      text: "No network request was made. You can open the existing note or try with a different video.",
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
