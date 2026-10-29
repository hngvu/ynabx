import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const USER_DATA_DIR = path.resolve(__dirname, ".user-data");
export const OUTPUT_DIR = path.resolve(__dirname, "output");

/**
 * Connects to an existing Chrome instance via CDP or launches a persistent browser context.
 * @param {Object} options
 * @param {boolean} [options.headless=false]
 * @param {boolean} [options.recordHar=false]
 * @param {string} [options.harPath]
 * @returns {Promise<{ context: import('playwright').BrowserContext, page: import('playwright').Page, isCDP: boolean }>}
 */
export async function getBrowserContext(options = {}) {
  const args = process.argv.slice(2);
  const useCdp = args.includes("--cdp") || process.env.CDP_PORT || process.env.CDP_URL;
  const isHeadless = args.includes("--headless") || options.headless || false;

  if (useCdp) {
    const cdpEndpoint = process.env.CDP_URL || `http://localhost:${process.env.CDP_PORT || 9222}`;
    console.log(`Connecting via CDP to ${cdpEndpoint}...`);
    try {
      const browser = await chromium.connectOverCDP(cdpEndpoint);
      const contexts = browser.contexts();
      const context = contexts[0] || (await browser.newContext());
      const pages = context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();
      return { context, page, isCDP: true };
    } catch (err) {
      console.warn(`Could not connect via CDP (${err.message}). Falling back to persistent browser context...`);
    }
  }

  console.log(`Launching persistent browser context with profile at:\n  ${USER_DATA_DIR}`);
  const launchOptions = {
    headless: isHeadless,
    viewport: { width: 1440, height: 900 },
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox"
    ]
  };

  if (options.recordHar && options.harPath) {
    launchOptions.recordHar = {
      path: options.harPath,
      mode: "full"
    };
  }

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, launchOptions);
  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  return { context, page, isCDP: false };
}
