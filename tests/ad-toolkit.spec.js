const { expect, test } = require("@playwright/test");
const fs = require("node:fs");

const hlsUrl = "9e467af4-5479-4c26-a393-c445a32acd19";
const expandedHlsUrl = "https://dashvideo.quavermusic.com/QuaverVOD/smil:9e467af4-5479-4c26-a393-c445a32acd19.smil/playlist.m3u8";
const scriptPath = "C:/Users/DanielW1814/Downloads/Lines and Spaces Episode.txt";

test("AD analyzer loads HLS audio, draws waveform, zooms, and evaluates script fit", async ({ page }) => {
  const scriptText = fs.readFileSync(scriptPath, "utf8");
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.locator("#visualFileButton")).toBeVisible();
  const visualFileButtonContrast = await page.locator("#visualFileButton").evaluate((button) => {
    const parseRgb = (value) => value.match(/\d+/g).slice(0, 3).map(Number);
    const luminance = ([red, green, blue]) => {
      const channels = [red, green, blue].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const styles = getComputedStyle(button);
    const foreground = luminance(parseRgb(styles.color));
    const background = luminance(parseRgb(styles.backgroundColor));
    const lighter = Math.max(foreground, background);
    const darker = Math.min(foreground, background);
    return (lighter + 0.05) / (darker + 0.05);
  });
  expect(visualFileButtonContrast).toBeGreaterThanOrEqual(7);
  await page.getByRole("button", { name: "AD gap analyzer" }).click();
  await expect(page.locator("#adWorkspace")).toBeVisible();

  await page.locator("#scriptInput").fill(scriptText);
  await expect(page.locator("#scriptStats")).toContainText("cues");

  await page.locator("#waveformZoomInput").evaluate((input) => {
    input.value = "2.5";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#waveformZoomValue")).toHaveText("2.5x");
  await page.locator("#waveformZoomInButton").click();
  await expect(page.locator("#waveformZoomValue")).toHaveText("3x");
  await page.locator("#waveformZoomOutButton").click();
  await expect(page.locator("#waveformZoomValue")).toHaveText("2.5x");
  await expect(page.locator("#waveformCanvas")).toHaveCSS("width", /.+/);

  await page.locator("#ttsRateInput").evaluate((input) => {
    input.value = "1.4";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#ttsRateValue")).toHaveText("1.4x");
  await expect(page.locator("#ttsVoiceSelect")).toBeVisible();

  await page.locator("#ttsSyncToggle").check();
  await expect(page.locator("#ttsSyncToggle")).toBeChecked();
  await page.locator("#extendedAdToggle").check();
  await expect(page.locator("#extendedAdToggle")).toBeChecked();

  await page.locator("#videoUrlInput").fill(hlsUrl);
  await page.getByRole("button", { name: "Analyze video audio" }).click();
  await expect(page.locator("#videoUrlInput")).toHaveValue(expandedHlsUrl);

  await expect(page.locator("#adStatusText")).toContainText(/Analyzed|No openings found/, { timeout: 120000 });
  await expect(page.locator("#adStatusText")).not.toContainText(/could not|did not list|failed/i);

  const rowCount = await page.locator("#gapResults tr[data-gap-index]").count();
  expect(rowCount).toBeGreaterThan(0);

  await expect(page.locator("#scriptFitValue")).not.toHaveText("0/0");
  const scriptCueCount = await page.locator("#scriptCueList .review-item").count();
  const missingScriptGapCount = await page.locator("#missingScriptGapList .review-item").count();
  expect(scriptCueCount).toBeGreaterThan(0);
  expect(missingScriptGapCount).toBeGreaterThan(0);
  await expect(page.locator("#scriptCueSummary")).toContainText(/cue/);
  await expect(page.locator("#missingScriptSummary")).toContainText(/gap/);
  await expect(page.locator("#scriptCueList .review-item.risk").first()).toBeVisible();

  const canvasInfo = await page.locator("#waveformCanvas").evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonWhitePixels = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] < 245 || data[index + 1] < 245 || data[index + 2] < 245) {
        nonWhitePixels += 1;
      }
    }
    return {
      cssWidth: canvas.style.width,
      displayWidth: rect.width,
      nonWhitePixels,
    };
  });
  expect(canvasInfo.cssWidth).toBe("250%");
  expect(canvasInfo.nonWhitePixels).toBeGreaterThan(1000);

  await page.locator("#gapResults tr[data-gap-index='0']").click();
  const currentTime = await page.locator("#videoPreview").evaluate((video) => video.currentTime);
  expect(currentTime).toBeGreaterThanOrEqual(0);

  const activeRows = await page.locator("#gapResults tr.active-gap").count();
  expect(activeRows).toBeLessThanOrEqual(1);

  await page.locator("#scriptCueList .review-item").first().click();
  const scriptCueTime = await page.locator("#videoPreview").evaluate((video) => video.currentTime);
  expect(scriptCueTime).toBeGreaterThanOrEqual(0);

  await page.locator("#missingScriptGapList .review-item").first().click();
  const missingGapTime = await page.locator("#videoPreview").evaluate((video) => video.currentTime);
  expect(missingGapTime).toBeGreaterThanOrEqual(0);

  const tooltipText = await page.locator("#waveformCanvas").evaluate((canvas) => {
    const wrapper = canvas.parentElement;
    const regions = window.__waveformGapRegionsForTest || [];
    const region = regions.find((candidate) => candidate.width > 4) || regions[0];
    if (!region) return null;
    wrapper.scrollLeft = Math.max(0, region.x - 80);
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent("mousemove", {
      bubbles: true,
      clientX: rect.left + region.x + Math.min(10, Math.max(1, region.width / 2)),
      clientY: rect.top + region.y + Math.min(20, Math.max(1, region.height / 2)),
    }));
    return document.querySelector("#waveformTooltip").textContent;
  });
  expect(tooltipText).toContain("AD words");
  await expect(page.locator("#waveformTooltip")).toBeVisible();
  await expect(page.locator("#waveformTooltip")).toContainText("AD words");

  const appErrors = consoleMessages.filter((message) => (
    /error/i.test(message)
    && !message.includes("404")
    && !message.includes("favicon")
  ));
  expect(appErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
