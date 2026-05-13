import { App, MarkdownRenderer, Component } from "obsidian";

interface PrintToPDFOptions {
  marginsType: number;
  printBackground: boolean;
  printSelectionOnly: boolean;
  landscape: boolean;
}
interface ElectronWebContents {
  once(event: string, listener: () => void): void;
  printToPDF(options: PrintToPDFOptions): Promise<Uint8Array>;
}
interface BrowserWindowInstance {
  webContents: ElectronWebContents;
  loadURL(url: string): Promise<void>;
  close(): void;
}
interface ElectronRemote {
  BrowserWindow?: new (options: { show: boolean; width: number; height: number }) => BrowserWindowInstance;
  getCurrentWebContents?(): ElectronWebContents | null;
}
interface ElectronModule {
  remote?: ElectronRemote;
}

/**
 * Converts markdown content to HTML
 */
async function markdownToHtml(
  app: App,
  markdown: string,
): Promise<string> {
  // Create a temporary container element
  const container = activeDocument.body.createDiv("markdown-preview-view youtube-transcript-pdf-render-container");

  // Create a Component to avoid memory leaks
  const component = new Component();

  try {
    // Use Obsidian's MarkdownRenderer to convert markdown to HTML
    await MarkdownRenderer.render(
      app,
      markdown,
      container,
      "",
      component,
    );

    // Wait a bit for rendering to complete (images, embeds, etc.)
    await new Promise((resolve) => activeWindow.setTimeout(resolve, 100));

    // Get the HTML content
    const html = container.innerHTML;
    
    // Clean up component and container
    component.unload();
    activeDocument.body.removeChild(container);
    
    return html;
  } catch (error: unknown) {
    // Clean up on error
    component.unload();
    if (container.parentNode) {
      activeDocument.body.removeChild(container);
    }
    throw error;
  }
}

/**
 * Generates PDF from HTML content
 * Uses Electron's printToPDF API if available, otherwise creates a simple PDF
 */
async function htmlToPdf(html: string): Promise<ArrayBuffer> {
  // Try to use Electron's printToPDF API
  let electron: ElectronModule | null = null;
  try {
    const win = window as Window & { require?: (module: string) => unknown };
    const requireFn = win.require;
    if (requireFn) {
      const result = requireFn("electron");
      electron = (result as unknown) as ElectronModule;
    }
  } catch {
    // require not available
  }

  if (!electron) {
    throw new Error(
      "PDF generation requires Electron API. Please use markdown format instead.",
    );
  }

  const remote = (electron as ElectronModule).remote as ElectronRemote;
  if (!remote) {
    throw new Error("Electron remote API not available");
  }

  // Use BrowserWindow to create a hidden window for PDF generation
  // This is more reliable than manipulating the current document
  try {
    const BrowserWindowConstructor = remote.BrowserWindow;

    if (!BrowserWindowConstructor) {
      throw new Error("BrowserWindow API not available");
    }

    // Create a hidden window
    const printWindow = new BrowserWindowConstructor({
      show: false,
      width: 1200,
      height: 1600,
    }) as BrowserWindowInstance;

    try {
      // Set up load listener before loading URL
      const loadPromise = new Promise<void>((resolve) => {
        printWindow.webContents.once("did-finish-load", () => {
          // Wait for rendering to complete
          activeWindow.setTimeout(() => resolve(), 1000);
        });
      });

      // Load the HTML content
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      // Wait for content to fully load and render
      await loadPromise;

      // Generate PDF
      const pdfData = await printWindow.webContents.printToPDF({
        marginsType: 1, // No margins
        printBackground: true,
        printSelectionOnly: false,
        landscape: false,
      });

      // Close the window
      printWindow.close();

      const arrayBuffer = (pdfData as unknown as Uint8Array).buffer.slice(
        (pdfData as unknown as Uint8Array).byteOffset,
        (pdfData as unknown as Uint8Array).byteOffset + (pdfData as unknown as Uint8Array).byteLength,
      ) as ArrayBuffer;
      return arrayBuffer;
    } catch (error) {
      printWindow.close();
      throw error;
    }
  } catch (error) {
    // Fallback: try using current webContents with a data URL approach
    try {
      const getWebContents = (remote as ElectronRemote).getCurrentWebContents;
      if (!getWebContents) {
        throw new Error("Cannot access web contents");
      }

      const webContents = getWebContents();
      const hasMethod = webContents && (webContents as unknown as {printToPDF?: unknown}).printToPDF;
      if (!webContents || !hasMethod) {
        throw new Error("Current web contents does not support PDF generation");
      }

      // Create a temporary iframe with data URL
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

      // Create iframe to load content
      const iframe = activeDocument.body.createEl("iframe");
      iframe.addClass("youtube-transcript-pdf-iframe");
      iframe.src = dataUrl;

      // Wait for iframe to load
      await new Promise<void>((resolve, reject) => {
        const timeout: number = activeWindow.setTimeout(() => {
          activeDocument.body.removeChild(iframe);
          reject(new Error("PDF generation timed out"));
        }, 10000);

        iframe.onload = () => {
          activeWindow.clearTimeout(timeout);
          activeWindow.setTimeout(resolve, 500);
        };
        iframe.onerror = () => {
          activeWindow.clearTimeout(timeout);
          activeDocument.body.removeChild(iframe);
          reject(new Error("Failed to load content"));
        };
      });

      // Generate PDF
      const pdfData = await (webContents as unknown as ElectronWebContents).printToPDF({
        marginsType: 1,
        printBackground: true,
        printSelectionOnly: false,
        landscape: false,
      });

      // Clean up
      activeDocument.body.removeChild(iframe);

      const arrayBuffer = (pdfData as unknown as Uint8Array).buffer.slice(
        (pdfData as unknown as Uint8Array).byteOffset,
        (pdfData as unknown as Uint8Array).byteOffset + (pdfData as unknown as Uint8Array).byteLength,
      ) as ArrayBuffer;
      return arrayBuffer;
    } catch {
      // If fallback also fails, throw original error
    }

    throw error instanceof Error
      ? error
      : new Error("PDF generation failed");
  }
}

/**
 * Generates PDF from markdown content
 */
export async function generatePdfFromMarkdown(
  app: App,
  markdown: string,
): Promise<ArrayBuffer> {
  try {
    // Convert markdown to HTML
    const html = await markdownToHtml(app, markdown);
    
    // Ensure we have content
    if (!html || html.trim().length === 0) {
      throw new Error("Generated HTML is empty. Cannot create PDF.");
    }

    // Wrap in a complete HTML document with comprehensive styles
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #000;
      background: #fff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: bold;
      color: #000;
    }
    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    p {
      margin: 1em 0;
      color: #000;
    }
    a {
      color: #0066cc;
      text-decoration: underline;
    }
    a:visited {
      color: #551a8b;
    }
    code {
      background-color: #f4f4f4;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: "Courier New", Courier, monospace;
      font-size: 0.9em;
      color: #000;
    }
    pre {
      background-color: #f4f4f4;
      padding: 10px;
      border-radius: 5px;
      overflow-x: auto;
      color: #000;
    }
    pre code {
      background: transparent;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 1em 0;
      padding-left: 20px;
      color: #666;
    }
    ul, ol {
      margin: 1em 0;
      padding-left: 2em;
      color: #000;
    }
    li {
      margin: 0.5em 0;
      color: #000;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
      color: #000;
    }
    th {
      background-color: #f4f4f4;
      font-weight: bold;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

    // Generate PDF
    return await htmlToPdf(fullHtml);
  } catch (error) {
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
