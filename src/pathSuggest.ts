import {
	App,
	type TAbstractFile,
	AbstractInputSuggest,
	TFolder,
} from "obsidian";

export abstract class PathSuggest extends AbstractInputSuggest<TAbstractFile> {
	private inputEl: HTMLInputElement;

	constructor(
		app: App,
		inputEl: HTMLInputElement,
	) {
		super(app, inputEl);
		this.inputEl = inputEl;
	}

	getSuggestions(inputStr: string) {
		const suggestions = this.getSuggestionsInternal(inputStr);
		if (suggestions.length > 0) {
			return suggestions;
		}

		return [];
	}

	abstract getSuggestionsInternal(input: string): TAbstractFile[];

	renderSuggestion(file: TAbstractFile, el: HTMLElement): void {
		// Only render folders - this is a safety check
		// FolderSuggest should only return folders, but this ensures we never render files
		if (file instanceof TFolder) {
			el.createDiv({
				text: file.name,
				cls: "suggestion-item",
			});
		}
		// If somehow a non-folder gets through, don't render it
	}

	selectSuggestion(file: TAbstractFile): void {
		this.inputEl.value = file.path;
		this.inputEl.trigger("input");
		this.close();
	}
}
