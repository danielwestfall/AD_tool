# A11y Review Toolkit

A small local browser app for checking accessibility visuals and reviewing likely audio-description gaps in finished videos.

## What You Need

- A computer with Windows or macOS.
- Python 3. Most recent Macs already include a `python3` command, but you may still need to install Python from python.org. On Windows, install Python from the Microsoft Store or python.org.
- Google Chrome, Microsoft Edge, or Safari. Chrome is best for the included Playwright test.
- Node.js only if you want to run the automated Playwright browser test.

The app itself is just local HTML, CSS, and JavaScript. You do not need to install Python packages.

## Start The App On Windows

1. Open File Explorer.
2. Go to the folder that contains this project:

   ```text
   C:\Users\DanielW1814\Desktop\Non-site Tester
   ```

3. Click the address bar in File Explorer, type `powershell`, and press Enter.
4. In PowerShell, run:

   ```powershell
   python -m http.server 8766 --bind 127.0.0.1
   ```

5. Leave that PowerShell window open.
6. Open your browser and go to:

   ```text
   http://127.0.0.1:8766/
   ```

If Windows says `python` is not recognized, install Python 3, reopen PowerShell, and try again.

## Start The App On Mac

1. Open Terminal.
2. Type `cd `, including the space after `cd`.
3. Drag the project folder into Terminal. Terminal will paste the folder path.
4. Press Enter.
5. Run:

   ```bash
   python3 -m http.server 8766 --bind 127.0.0.1
   ```

6. Leave that Terminal window open.
7. Open your browser and go to:

   ```text
   http://127.0.0.1:8766/
   ```

If macOS says `python3` is not found, install Python 3 from python.org, reopen Terminal, and try again.

## Visual Checks

- Use `Visual effects`.
- Copy a snip or screenshot, click the page, then press `Ctrl+V` on Windows or `Command+V` on Mac.
- Use `Paste` in the Visual effects sidebar if the browser grants clipboard image access.
- Use `Load file` in the Visual effects sidebar or drag-and-drop for image files and PDFs.
- Choose an effect: grayscale, protanopia, deuteranopia, tritanopia, achromatopsia, low contrast, or high contrast.
- Toggle the original preview on/off and download the transformed result as PNG.

PDF rendering uses PDF.js from a CDN. Image paste and image-file loading still work if that network dependency is unavailable.

The interface uses high-contrast colors for the main controls and AD review states. The key text/control color pairs are designed to meet WCAG 2.2 AAA contrast where practical.

## Audio Description Gap Analyzer

1. Switch to `AD gap analyzer`.
2. Paste a direct video address, a SMIL address, an HLS `.m3u8` address, a Quaver VOD ID, or load a local video/audio file.
3. Click `Analyze video audio`.

Use the controls to adjust the review:

- `AD speech rate`: words per second used for script-fit math and recommended word capacity.
- `Waveform zoom`: expands the waveform horizontally. Use the slider or the `-` and `+` buttons in the waveform header.
- `Speech threshold dB`: absolute speech-band level treated as likely no-dialogue.
- `Speech lift over music`: how far above the estimated music bed audio must rise before it is treated as speech.
- `Minimum quiet gap`: shortest likely no-dialogue window worth listing.
- `Breathing room per gap`: time reserved so AD does not crowd dialogue.
- `Treat as no dialogue`: use only when you know the whole asset has no dialogue.

The result lists likely no-dialogue windows, duration, estimated AD word capacity, script fit, and average voice-band/mix levels. Because finished videos may have background music, the analyzer uses a speech-frequency-band heuristic instead of pure silence. Treat it as a fast triage pass and spot-check promising windows in playback.

## Waveform And Navigation

The `Audio Levels` graph shows:

- Full mix level.
- Speech-band level.
- Estimated music bed.
- Active speech cutoff.
- Shaded detected gaps.
- Stronger highlights for useful gaps.
- Red highlights where timed script appears to step on dialogue or does not fit the detected gap.

Hover a highlighted gap to see timing, duration, word capacity, and script fit. Click a waveform gap to jump playback to that opening. During playback, the graph shows a playhead and the matching table row highlights while the current time is inside a detected opening.

The results table scrolls inside its own panel and does not auto-scroll during playback.

## Script Review And TTS

Paste or load an AD script to compare script word count against each detected gap.

Timestamped lines such as this are matched to overlapping gaps:

```text
00:09 - 00:11 - Quaver speaks. A staff with notes on the lines appears.
```

The `Script Cues` panel shows each timed cue. Click a cue to jump the video and waveform to that cue. Cues turn red when they do not fit the detected gap or appear to overlap dialogue. Each cue shows a recommended words-per-second rate based on the available gap length and the script words provided.

The `Gaps Without Script` panel lists detected gaps that do not have matching AD script. Click one to jump to that gap.

Turn on `Speak script during playback` to preview timed script lines with browser text-to-speech. Use:

- `TTS speed` to change how fast the browser reads the script.
- `Voice` to pick a system/browser voice.
- `Pause for extended AD` to pause the video, read the cue with TTS, then resume playback when the cue finishes.
- `Stop TTS` to cancel the current reading.

On macOS, browser TTS uses the voices exposed by the browser through the Web Speech API. In Chrome or Safari, installed macOS voices should appear in the `Voice` menu after the page loads. If the menu looks incomplete, refresh the page or try Safari.

## SMIL And HLS Notes

Remote video addresses must be directly fetchable by the browser. If a hosting site blocks cross-origin requests, download the file and use `Load video`.

For Quaver VOD links, you can paste only the ID. For example, this:

```text
9e467af4-5479-4c26-a393-c445a32acd19
```

automatically expands to:

```text
https://dashvideo.quavermusic.com/QuaverVOD/smil:9e467af4-5479-4c26-a393-c445a32acd19.smil/playlist.m3u8
```

For SMIL, the app reads the XML and follows the first `video`, `audio`, `ref`, or `media` `src` it finds. Relative URLs are resolved from the SMIL address. Browser-fetch limits still apply, and legacy streaming protocols such as `rtsp:` or `mms:` cannot be decoded in the browser.

For HLS `.m3u8`, the app reads the playlist and prefers a normal non-AD `TYPE=AUDIO` rendition when one is present. It avoids common AD labels such as `English_AD`, `Audio Description`, `Descriptive Audio`, and `public.accessibility.describes-video`. If the playlist does not mark normal audio as default, the app creates an in-memory preview playlist that selects the normal audio track. AAC audio segments are decoded one by one and stitched together for analysis.

HLS streams with encrypted audio, blocked CORS, video-only playlists, or MPEG-TS-only media may still need a server-side ffmpeg/transmux step or a downloaded MP4/MOV export.

## Run The Automated Browser Test

Install Node.js first if you do not already have it.

From the project folder, run:

```bash
npm install
npm test
```

The Playwright test opens the local app in Chrome, analyzes a real HLS sample, checks that the waveform draws, verifies zoom, checks script-fit output, and confirms the waveform tooltip works.

To see the browser while the test runs:

```bash
npm run test:headed
```
