// Minimal runtime stand-in for the "obsidian" package, which only ships type
// declarations. Tests that need specific behavior should vi.mock("obsidian").
export class Notice {
  constructor(_message?: string, _timeout?: number) {}
  setMessage(_message: string): this {
    return this;
  }
  hide(): void {}
}

export function requestUrl(): Promise<never> {
  return Promise.reject(new Error("requestUrl is not available in tests"));
}

// Minimal stand-in so `instanceof TFile` checks work in tests; real TFile has
// many more members, but nothing in src/ reads them.
export class TFile {
  path: string;
  constructor(path: string) {
    this.path = path;
  }
}

export const Platform = {
  isMobile: false,
  isDesktop: true,
  isMobileApp: false,
  isDesktopApp: true,
  isIosApp: false,
  isAndroidApp: false,
};
