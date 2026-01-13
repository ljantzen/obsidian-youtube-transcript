import { TFolder, TFile, type TAbstractFile } from "obsidian";
import { PathSuggest } from "./pathSuggest";

export class FolderSuggest extends PathSuggest {
	public getSuggestionsInternal(input: string): TAbstractFile[] {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const folders: TFolder[] = [];
		const lowerCaseInput = input.toLowerCase();

		for (const file of abstractFiles) {
			// Only include directories (folders), explicitly exclude files
			if (file instanceof TFolder && file.path.toLowerCase().includes(lowerCaseInput)) {
				folders.push(file);
			}
		}

		// Return only folders - type assertion is safe since we've filtered
		return folders as TAbstractFile[];
	}
}

export class FileSuggest extends PathSuggest {
	public getSuggestionsInternal(input: string): TAbstractFile[] {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const files: TFile[] = [];
		const lowerCaseInput = input.toLowerCase();

		for (const file of abstractFiles) {
			// Only include markdown files
			if (file instanceof TFile && file.extension === "md" && file.path.toLowerCase().includes(lowerCaseInput)) {
				files.push(file);
			}
		}

		return files as TAbstractFile[];
	}

	renderSuggestion(file: TAbstractFile, el: HTMLElement): void {
		// Render markdown files
		if (file instanceof TFile) {
			el.createDiv({
				text: file.path,
				cls: "suggestion-item",
			});
		}
	}
}
