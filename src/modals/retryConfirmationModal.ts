import { App, Modal } from "obsidian";

export class RetryConfirmationModal extends Modal {
  result: boolean | null = null;
  resolvePromise: ((value: boolean | null) => void) | null = null;
  errorMessage: string;
  providerName: string;

  constructor(app: App, errorMessage: string, providerName = "LLM") {
    super(app);
    this.errorMessage = errorMessage;
    this.providerName = providerName;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", {
      text: `${this.providerName} request timed out`,
    });

    contentEl.createEl("p", {
      text: this.errorMessage,
    });

    contentEl.createEl("p", {
      text: `Would you like to retry the ${this.providerName} processing?`,
    });

    const buttonContainer = contentEl.createDiv({
      attr: { style: "text-align: right; margin-top: 1em;" },
    });

    const cancelButton = buttonContainer.createEl("button", {
      text: "Cancel",
    });
    cancelButton.onclick = () => {
      this.result = null; // null means cancelled/aborted
      if (this.resolvePromise) {
        this.resolvePromise(null);
      }
      this.close();
    };

    const retryButton = buttonContainer.createEl("button", {
      text: "Retry",
    });
    retryButton.setCssProps({ "margin-left": "0.5em" });
    retryButton.onclick = () => {
      this.result = true;
      if (this.resolvePromise) {
        this.resolvePromise(true);
      }
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    // If modal was closed without clicking a button (e.g., clicking X), treat as cancellation
    if (this.result === null && this.resolvePromise) {
      this.resolvePromise(null);
    }
  }

  waitForResponse(): Promise<boolean | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }
}
