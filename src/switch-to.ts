import { showHUD } from "@raycast/api";
import { execSync } from "child_process";

/**
 * Uses JXA to cycle to the next Chrome window.
 * Takes the last window and brings it to the front.
 * Returns the title of the newly focused window, or null if failed.
 */
const cycleToNextWindow = (): string | null => {
  const jxaScript = `
    (() => {
      const chrome = Application("Google Chrome");

      if (!chrome.running()) {
        return JSON.stringify({ success: false, error: "Chrome is not running" });
      }

      const windows = chrome.windows();

      if (windows.length === 0) {
        return JSON.stringify({ success: false, error: "No Chrome windows open" });
      }

      if (windows.length === 1) {
        chrome.activate();
        return JSON.stringify({ success: true, title: windows[0].title(), single: true });
      }

      // Get the last window and bring it to front by setting its index to 1
      const lastWindow = windows[windows.length - 1];
      const title = lastWindow.title();
      lastWindow.index = 1;
      chrome.activate();

      return JSON.stringify({ success: true, title: title });
    })()
  `;

  try {
    const result = execSync(`osascript -l JavaScript -e '${jxaScript}'`, {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();

    const parsed = JSON.parse(result);

    if (!parsed.success) {
      return null;
    }

    if (parsed.single) {
      return "single";
    }

    return parsed.title || "Chrome";
  } catch {
    return null;
  }
};

export default async function Command() {
  const result = cycleToNextWindow();

  if (result === null) {
    await showHUD("Chrome is not running or has no windows");
    return;
  }

  if (result === "single") {
    await showHUD("Only one window open");
    return;
  }

  await showHUD(`Switched profile`);
}
