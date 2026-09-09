const { expect, test } = require("@playwright/test");

test("extended AD resume does not re-speak the 00:09 cue at the same timestamp", async ({ page }) => {
  await page.addInitScript(() => {
    window.__ttsCalls = [];
    window.__videoCalls = [];

    class FakeUtterance extends EventTarget {
      constructor(text) {
        super();
        this.text = text;
        this.rate = 1;
      }
    }

    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: FakeUtterance,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [],
        addEventListener: () => {},
        cancel: () => window.__ttsCalls.push({ type: "cancel" }),
        speak: (utterance) => {
          window.__ttsCalls.push({ type: "speak", text: utterance.text, rate: utterance.rate });
          setTimeout(() => utterance.dispatchEvent(new Event("end")), 0);
        },
      },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "AD gap analyzer" }).click();
  await page.locator("#scriptInput").fill(`00:00 - Title card appears.
00:09 - Two hands give a thumbs-up.
00:13 - The hands leave the screen.`);
  await page.locator("#ttsSyncToggle").check();
  await page.locator("#extendedAdToggle").check();

  await page.locator("#videoPreview").evaluate((video) => {
    let mediaTime = 8.9;
    let paused = true;
    Object.defineProperty(video, "currentTime", {
      configurable: true,
      get: () => mediaTime,
      set: (value) => { mediaTime = value; },
    });
    Object.defineProperty(video, "paused", {
      configurable: true,
      get: () => paused,
    });
    Object.defineProperty(video, "ended", {
      configurable: true,
      get: () => false,
    });
    video.pause = () => {
      paused = true;
      window.__videoCalls.push({ type: "pause", currentTime: mediaTime });
      video.dispatchEvent(new Event("pause"));
    };
    video.play = () => {
      paused = false;
      window.__videoCalls.push({ type: "play", currentTime: mediaTime });
      video.dispatchEvent(new Event("play"));
      return Promise.resolve();
    };
  });

  await page.locator("#videoPreview").evaluate((video) => video.play());
  await page.locator("#videoPreview").evaluate((video) => {
    video.currentTime = 9;
    video.dispatchEvent(new Event("timeupdate"));
  });
  await page.waitForTimeout(50);

  const spokenTexts = await page.evaluate(() => window.__ttsCalls.filter((call) => call.type === "speak").map((call) => call.text));
  expect(spokenTexts).toEqual(["Two hands give a thumbs-up."]);
});
