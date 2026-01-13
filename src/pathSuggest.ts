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
		// Default implementation - can be overridden by subclasses
		if (file instanceof TFolder) {
			el.createDiv({
				text: file.name,
				cls: "suggestion-item",
			});
		}
	}

	selectSuggestion(file: TAbstractFile): void {
		this.inputEl.value = file.path;
		this.inputEl.trigger("input");
		this.close();
	}
}
