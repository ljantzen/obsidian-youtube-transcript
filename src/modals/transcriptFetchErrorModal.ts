import { App, Modal } from "obsidian";

export class TranscriptFetchErrorModal extends Modal {
  private errorMessage: string;

  constructor(app: App, errorMessage: string) {
    super(app);
    this.errorMessage = errorMessage;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", {
      text: "Could Not Fetch Transcript",
      attr: { style: "color: var(--text-error);" },
    });

    const msgBox = contentEl.createDiv({
      attr: {
        style:
          "background: var(--background-secondary); padding: 0.75em; border-radius: 4px; margin-bottom: 1em; word-break: break-word; font-size: 0.9em; font-family: var(--font-monospace);",
      },
    });
    msgBox.setText(this.errorMessage);

    const isAuthBlock = this.errorMessage.includes("YouTube now requires authentication");
    const isFullApiFailure =
      this.errorMessage.includes("Watch page fallback") ||
      this.errorMessage.includes("All clients failed");

    if (isAuthBlock) {
      contentEl.createEl("p", {
        text: "YouTube has changed how it serves transcripts and now blocks unauthenticated requests. This affects all videos universally — it is not specific to this video or channel.",
        attr: { style: "margin-bottom: 0.75em; font-weight: 600;" },
      });

      contentEl.createEl("p", {
        text: "Until this plugin adds authentication support, there is no workaround within Obsidian. As an alternative, you can:",
        attr: { style: "margin-bottom: 0.5em;" },
      });

      const list = contentEl.createEl("ul", {
        attr: { style: "margin: 0 0 1em 1.5em;" },
      });
      for (const item of [
        "Use yt-dlp (free CLI tool) to download the transcript manually.",
        "Copy the transcript from YouTube's built-in transcript panel (the '...' menu under the video).",
      ]) {
        list.createEl("li", { text: item });
      }
    } else if (isFullApiFailure) {
      contentEl.createEl("p", {
        text: "All transcript access methods were tried and failed. This can happen because:",
        attr: { style: "margin-bottom: 0.5em; font-weight: 600;" },
      });

      const list = contentEl.createEl("ul", {
        attr: { style: "margin: 0 0 1em 1.5em;" },
      });
      for (const item of [
        "The video is private or has been removed.",
        "The video requires login to view.",
        "YouTube is rate-limiting requests — try again in a few minutes.",
        "YouTube has changed their API — a plugin update may be needed.",
      ]) {
        list.createEl("li", { text: item });
      }
    }

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
    this.contentEl.empty();
  }
}
