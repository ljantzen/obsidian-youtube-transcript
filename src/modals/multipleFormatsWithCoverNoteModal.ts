import { App, Modal } from "obsidian";

export class MultipleFormatsWithCoverNoteModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", {
      text: "PDF Cover Notes Disabled",
      attr: { style: "color: var(--text-warning);" },
    });

    contentEl.createEl("p", {
      text: "You have selected multiple file formats (e.g., Markdown and PDF) in a single request.",
      attr: { style: "margin-bottom: 1em;" },
    });

    contentEl.createEl("p", {
      text: "PDF cover notes are incompatible with multiple format selection because each format needs to be created in its designated location.",
      attr: { style: "margin-bottom: 1em;" },
    });

    const noteContainer = contentEl.createDiv({
      attr: {
        style:
          "background: var(--background-secondary); padding: 0.75em; border-radius: 4px; margin-bottom: 1em;",
      },
    });
    noteContainer.createEl("p", {
      text: "PDF cover notes have been disabled for this request. All transcripts will be created in their default locations.",
      attr: { style: "margin: 0;" },
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
