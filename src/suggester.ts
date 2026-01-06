import { TFolder, type TAbstractFile } from "obsidian";
import { PathSuggest } from "./pathSuggest";

export class FolderSuggest extends PathSuggest {
	public getSuggestionsInternal(input: string): TAbstractFile[] {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const folders: TFolder[] = [];
		const lowerCaseInput = input.toLowerCase();

		for (const file of abstractFiles) {
			if (
				file instanceof TFolder &&
				file.path.toLowerCase().includes(lowerCaseInput)
			) {
				folders.push(file);
			}
		}

		return folders;
	}
}
