import { showHUD } from "@raycast/api";
import { execSync } from "child_process";

// Map of Chromium browser bundle IDs to their application names
const CHROMIUM_BROWSERS: Record<string, string> = {
  "com.google.chrome": "Google Chrome",
  "com.google.chrome.canary": "Google Chrome Canary",
  "com.microsoft.edgemac": "Microsoft Edge",
  "com.microsoft.edgemac.beta": "Microsoft Edge Beta",
  "com.microsoft.edgemac.dev": "Microsoft Edge Dev",
  "com.brave.browser": "Brave Browser",
  "com.brave.browser.beta": "Brave Browser Beta",
  "com.brave.browser.nightly": "Brave Browser Nightly",
  "com.vivaldi.vivaldi": "Vivaldi",
  "com.operasoftware.opera": "Opera",
  "org.chromium.chromium": "Chromium",
};

const DEFAULT_BROWSER = "Google Chrome";

/**
 * Gets the default browser's application name if it's a Chromium-based browser.
 * Falls back to Google Chrome if no supported browser is detected.
 */
const getDefaultBrowser = (): string => {
  try {
    // Get the default browser bundle ID using macOS defaults command
    const bundleId = execSync(
      `defaults read ~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers | grep -B1 "https" | grep "LSHandlerRoleAll" | head -1 | sed 's/.*= "\\(.*\\)";/\\1/'`,
      { encoding: "utf-8", timeout: 2000 },
    ).trim();

    if (bundleId && CHROMIUM_BROWSERS[bundleId.toLowerCase()]) {
      return CHROMIUM_BROWSERS[bundleId.toLowerCase()];
    }

    // Fallback: try alternative method using URL scheme
    const altBundleId = execSync(
      `defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers 2>/dev/null | grep -A2 "LSHandlerURLScheme = https" | grep LSHandlerRoleAll | sed 's/.*= "\\(.*\\)";/\\1/' | head -1`,
      { encoding: "utf-8", timeout: 2000 },
    ).trim();

    if (altBundleId && CHROMIUM_BROWSERS[altBundleId.toLowerCase()]) {
      return CHROMIUM_BROWSERS[altBundleId.toLowerCase()];
    }

    return DEFAULT_BROWSER;
  } catch {
    return DEFAULT_BROWSER;
  }
};

interface CycleResult {
  success: boolean;
  browserName: string;
  single?: boolean;
}

/**
 * Uses JXA to cycle to the next browser window.
 * Takes the last window and brings it to the front.
 */
const cycleToNextWindow = (browserName: string): CycleResult => {
  const jxaScript = `
    (() => {
      const browser = Application("${browserName}");

      if (!browser.running()) {
        return JSON.stringify({ success: false, error: "not running" });
      }

      const windows = browser.windows();

      if (windows.length === 0) {
        return JSON.stringify({ success: false, error: "no windows" });
      }

      if (windows.length === 1) {
        browser.activate();
        return JSON.stringify({ success: true, single: true });
      }

      // Get the last window and bring it to front by setting its index to 1
      const lastWindow = windows[windows.length - 1];
      lastWindow.index = 1;
      browser.activate();

      return JSON.stringify({ success: true });
    })()
  `;

  try {
    const result = execSync(`osascript -l JavaScript -e '${jxaScript}'`, {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();

    const parsed = JSON.parse(result);
    return { ...parsed, browserName };
  } catch {
    return { success: false, browserName };
  }
};

export default async function Command() {
  // Detect default browser (falls back to Chrome if not a supported Chromium browser)
  const browserName = getDefaultBrowser();
  const result = cycleToNextWindow(browserName);

  if (!result.success) {
    await showHUD(`${browserName} is not running or has no windows`);
    return;
  }

  if (result.single) {
    await showHUD(`Only one ${browserName} window open`);
    return;
  }

  await showHUD(`Switched profile`);
}
