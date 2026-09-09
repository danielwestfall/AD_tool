const fileInput = document.querySelector("#fileInput");
const pasteButton = document.querySelector("#pasteButton");
const visualModeButton = document.querySelector("#visualModeButton");
const adModeButton = document.querySelector("#adModeButton");
const visualFileButton = document.querySelector("#visualFileButton");
const dropZone = document.querySelector("#dropZone");
const adWorkspace = document.querySelector("#adWorkspace");
const effectSelect = document.querySelector("#effectSelect");
const zoomRange = document.querySelector("#zoomRange");
const zoomValue = document.querySelector("#zoomValue");
const compareToggle = document.querySelector("#compareToggle");
const pageSelect = document.querySelector("#pageSelect");
const pdfControls = document.querySelector("#pdfControls");
const downloadButton = document.querySelector("#downloadButton");
const statusText = document.querySelector("#statusText");
const emptyState = document.querySelector("#emptyState");
const canvasGrid = document.querySelector("#canvasGrid");
const originalPanel = document.querySelector("#originalPanel");
const effectCaption = document.querySelector("#effectCaption");
const originalCanvas = document.querySelector("#originalCanvas");
const effectCanvas = document.querySelector("#effectCanvas");
const originalCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
const effectCtx = effectCanvas.getContext("2d", { willReadFrequently: true });
const videoUrlInput = document.querySelector("#videoUrlInput");
const videoFileInput = document.querySelector("#videoFileInput");
const videoPreview = document.querySelector("#videoPreview");
const speechRateInput = document.querySelector("#speechRateInput");
const waveformZoomInput = document.querySelector("#waveformZoomInput");
const waveformZoomValue = document.querySelector("#waveformZoomValue");
const waveformZoomOutButton = document.querySelector("#waveformZoomOutButton");
const waveformZoomInButton = document.querySelector("#waveformZoomInButton");
const waveformFollowToggle = document.querySelector("#waveformFollowToggle");
const silenceThresholdInput = document.querySelector("#silenceThresholdInput");
const speechLiftInput = document.querySelector("#speechLiftInput");
const cutoffStatusText = document.querySelector("#cutoffStatusText");
const minGapInput = document.querySelector("#minGapInput");
const paddingInput = document.querySelector("#paddingInput");
const scriptFileInput = document.querySelector("#scriptFileInput");
const noDialogueToggle = document.querySelector("#noDialogueToggle");
const analyzeAudioButton = document.querySelector("#analyzeAudioButton");
const adStatusText = document.querySelector("#adStatusText");
const gapCount = document.querySelector("#gapCount");
const totalGapTime = document.querySelector("#totalGapTime");
const maxSuggestedWords = document.querySelector("#maxSuggestedWords");
const scriptFitValue = document.querySelector("#scriptFitValue");
const gapResults = document.querySelector("#gapResults");
const scriptInput = document.querySelector("#scriptInput");
const scriptStats = document.querySelector("#scriptStats");
const ttsSyncToggle = document.querySelector("#ttsSyncToggle");
const extendedAdToggle = document.querySelector("#extendedAdToggle");
const ttsRateInput = document.querySelector("#ttsRateInput");
const ttsRateValue = document.querySelector("#ttsRateValue");
const ttsVoiceSelect = document.querySelector("#ttsVoiceSelect");
const saveScriptButton = document.querySelector("#saveScriptButton");
const stopTtsButton = document.querySelector("#stopTtsButton");
const scriptCueSummary = document.querySelector("#scriptCueSummary");
const scriptCueList = document.querySelector("#scriptCueList");
const missingScriptSummary = document.querySelector("#missingScriptSummary");
const missingScriptGapList = document.querySelector("#missingScriptGapList");
const waveformCanvas = document.querySelector("#waveformCanvas");
const waveformTooltip = document.querySelector("#waveformTooltip");
const waveformCtx = waveformCanvas.getContext("2d");

const matrices = {
  protanopia: [
    0.567, 0.433, 0,
    0.558, 0.442, 0,
    0, 0.242, 0.758,
  ],
  deuteranopia: [
    0.625, 0.375, 0,
    0.7, 0.3, 0,
    0, 0.3, 0.7,
  ],
  tritanopia: [
    0.95, 0.05, 0,
    0, 0.433, 0.567,
    0, 0.475, 0.525,
  ],
  achromatopsia: [
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114,
  ],
};

let sourceImage = null;
let activePdf = null;
let pdfjsLib = null;
let lastAudioFrames = [];
let lastAudioDuration = 0;
let lastAnalysis = null;
let currentGapRows = [];
let waveformGapRegions = [];
let scriptItems = [];
let spokenScriptItemIds = new Set();
let lastTtsPlaybackTime = 0;
let activeGapIndex = -1;
let isExtendedAdPause = false;
let isResumingAfterExtendedAd = false;
let loadedScriptFileName = "audio-description-script.txt";
const activePdfScale = 1.6;

const clamp = (value) => Math.max(0, Math.min(255, value));

function setStatus(message) {
  statusText.textContent = message;
}

function setAdStatus(message) {
  adStatusText.textContent = message;
}

function clearVideoPreview() {
  videoPreview.removeAttribute("src");
  videoPreview.load();
}

function setMode(mode) {
  const isVisual = mode === "visual";
  dropZone.classList.toggle("hidden", !isVisual);
  adWorkspace.classList.toggle("hidden", isVisual);
  pasteButton.classList.toggle("hidden", !isVisual);
  visualFileButton.classList.toggle("hidden", !isVisual);
  visualModeButton.classList.toggle("active", isVisual);
  adModeButton.classList.toggle("active", !isVisual);
}

function showCanvas() {
  emptyState.classList.add("hidden");
  canvasGrid.classList.remove("hidden");
  downloadButton.disabled = false;
}

function syncCompareView() {
  const showOriginal = compareToggle.checked;
  originalPanel.classList.toggle("hidden", !showOriginal);
  canvasGrid.classList.toggle("effect-only", !showOriginal);
}

function resizeCanvas(canvas, width, height) {
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = Math.round(width * Number(zoomRange.value) / 100) + "px";
  canvas.style.height = Math.round(height * Number(zoomRange.value) / 100) + "px";
}

function drawSourceToOriginalCanvas(image) {
  resizeCanvas(originalCanvas, image.width, image.height);
  resizeCanvas(effectCanvas, image.width, image.height);
  originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
  originalCtx.drawImage(image, 0, 0);
  applyEffect();
}

function applyMatrix(data, matrix) {
  for (let i = 0; i < data.length; i += 4) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    data[i] = clamp(red * matrix[0] + green * matrix[1] + blue * matrix[2]);
    data[i + 1] = clamp(red * matrix[3] + green * matrix[4] + blue * matrix[5]);
    data[i + 2] = clamp(red * matrix[6] + green * matrix[7] + blue * matrix[8]);
  }
}

function applyGrayscale(data) {
  for (let i = 0; i < data.length; i += 4) {
    const value = clamp(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
}

function applyContrast(data, amount, midpoint = 128) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp((data[i] - midpoint) * amount + midpoint);
    data[i + 1] = clamp((data[i + 1] - midpoint) * amount + midpoint);
    data[i + 2] = clamp((data[i + 2] - midpoint) * amount + midpoint);
  }
}

function applyEffect() {
  if (!sourceImage) return;

  effectCaption.textContent = effectSelect.options[effectSelect.selectedIndex].textContent;
  resizeCanvas(effectCanvas, sourceImage.width, sourceImage.height);
  effectCtx.drawImage(sourceImage, 0, 0);
  const imageData = effectCtx.getImageData(0, 0, effectCanvas.width, effectCanvas.height);
  const { data } = imageData;
  const effect = effectSelect.value;

  if (effect === "grayscale") {
    applyGrayscale(data);
  } else if (matrices[effect]) {
    applyMatrix(data, matrices[effect]);
  } else if (effect === "lowcontrast") {
    applyContrast(data, 0.42);
  } else if (effect === "highcontrast") {
    applyContrast(data, 1.85);
  }

  effectCtx.putImageData(imageData, 0, 0);
}

function refreshZoom() {
  zoomValue.textContent = zoomRange.value + "%";
  for (const canvas of [originalCanvas, effectCanvas]) {
    if (canvas.width && canvas.height) {
      canvas.style.width = Math.round(canvas.width * Number(zoomRange.value) / 100) + "px";
      canvas.style.height = Math.round(canvas.height * Number(zoomRange.value) / 100) + "px";
    }
  }
}

function formatTimestamp(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const wholeSeconds = Math.floor(safeSeconds % 60);
  const milliseconds = Math.round((safeSeconds - Math.floor(safeSeconds)) * 1000);
  const prefix = hours ? String(hours).padStart(2, "0") + ":" : "";
  return prefix + String(minutes).padStart(2, "0") + ":" + String(wholeSeconds).padStart(2, "0") + "." + String(milliseconds).padStart(3, "0");
}

function parseTimestamp(value) {
  const parts = String(value).trim().replace(",", ".").split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function classifyGap(suggestedWords, duration) {
  if (suggestedWords >= 16) return "Strong opening";
  if (suggestedWords >= 8) return "Useful phrase";
  if (suggestedWords >= 4) return "Brief insert";
  if (duration >= Number(minGapInput.value)) return "Timing only";
  return "Too tight";
}

function countWords(text) {
  return (text.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) || []).length;
}

function cleanScriptText(text) {
  return normalizeScriptText(text)
    .replace(/(?:^|\s)(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?(?:\s*(?:-->|[-–])\s*(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)?\s*(?:[-–])?/g, " ")
    .replace(/^\d+\s*$/gm, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

window.__cleanScriptTextForTest = () => cleanScriptText(scriptInput.value);

function normalizeScriptText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x20;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\\n/g, "\n")
    .replace(/\\+\s*/g, "\n");
}

function scriptHasTimestamp(text) {
  return /(?:^|[^0-9])(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?(?:[^0-9]|$)/.test(normalizeScriptText(text));
}

function parseScriptItems(text) {
  const normalized = normalizeScriptText(text);
  const items = [];
  const timeValue = "(?:\\d{1,2}:)?\\d{1,2}:\\d{2}(?:[.,]\\d{1,3})?";
  const cuePattern = new RegExp("(^|\\s)(" + timeValue + ")(?:\\s*(?:-->|[-–])\\s*(" + timeValue + "))?\\s*(?:[-–])?\\s*", "g");
  const matches = [];
  let match = cuePattern.exec(normalized);

  while (match) {
    matches.push({
      index: match.index + match[1].length,
      endIndex: cuePattern.lastIndex,
      startRaw: match[2],
      endRaw: match[3] || "",
    });
    match = cuePattern.exec(normalized);
  }

  for (let index = 0; index < matches.length; index += 1) {
    const cue = matches[index];
    const nextCue = matches[index + 1];
    const start = parseTimestamp(cue.startRaw);
    const explicitEnd = cue.endRaw ? parseTimestamp(cue.endRaw) : null;
    const end = explicitEnd ?? start;
    const textValue = cleanScriptText(normalized.slice(cue.endIndex, nextCue ? nextCue.index : normalized.length));
    if (start !== null && end !== null && end >= start && textValue) {
      items.push({
        id: items.length + "-" + start + "-" + end,
        start,
        end,
        text: textValue,
        words: countWords(textValue),
        singleTimestamp: explicitEnd === null,
      });
    }
  }

  if (items.length) {
    items.sort((a, b) => a.start - b.start);
    items.forEach((item, index) => {
      const nextItem = items[index + 1];
      item.windowEnd = item.singleTimestamp
        ? nextItem
          ? Math.max(item.start, nextItem.start)
          : item.start + Math.max(1, item.words / Math.max(1, Number(speechRateInput.value)))
        : item.end;
    });
    return items;
  }

  const captionBlocks = normalized.split(/\n{2,}/);
  for (const block of captionBlocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex === -1) continue;

    const [startRaw, endRaw] = lines[timingIndex].split("-->").map((part) => part.trim().split(/\s+/)[0]);
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);
    const textValue = cleanScriptText(lines.slice(timingIndex + 1).join(" "));
    if (start !== null && end !== null && end >= start && textValue) {
      items.push({
        id: items.length + "-" + start + "-" + end,
        start,
        end,
        text: textValue,
        words: countWords(textValue),
      });
    }
  }

  return items;
}

function getScriptForGap(gap) {
  if (!scriptItems.length) {
    const text = cleanScriptText(scriptInput.value);
    return { text, words: countWords(text), seconds: Number(speechRateInput.value) > 0 ? countWords(text) / Number(speechRateInput.value) : 0, timed: false };
  }

  const matchingItems = scriptItems.filter((item) => {
    if (item.singleTimestamp) {
      return item.start >= gap.start - 0.35 && item.start <= gap.end + 0.35;
    }
    const itemEnd = getScriptItemPlaybackEnd(item);
    return itemEnd >= gap.start - 0.35 && item.start <= gap.end + 0.35;
  });
  const text = matchingItems.map((item) => item.text).join(" ");
  const words = matchingItems.reduce((sum, item) => sum + item.words, 0);
  return { text, words, seconds: Number(speechRateInput.value) > 0 ? words / Number(speechRateInput.value) : 0, timed: true };
}

function getScriptStats() {
  scriptItems = parseScriptItems(scriptInput.value);
  window.__scriptItemsForTest = scriptItems;
  const words = scriptItems.length
    ? scriptItems.reduce((sum, item) => sum + item.words, 0)
    : countWords(scriptInput.value);
  const seconds = Number(speechRateInput.value) > 0 ? words / Number(speechRateInput.value) : 0;
  return { words, seconds };
}

function updateScriptStats() {
  const { words, seconds } = getScriptStats();
  const itemText = scriptItems.length ? ", " + scriptItems.length + " cue" + (scriptItems.length === 1 ? "" : "s") : "";
  scriptStats.textContent = words + " word" + (words === 1 ? "" : "s") + itemText + ", " + seconds.toFixed(1) + "s estimated";

  if (!lastAnalysis?.gaps?.length) {
    scriptFitValue.textContent = words + "/0";
    renderScriptReview();
    return;
  }

  const bestWords = Math.max(0, ...lastAnalysis.gaps.map((gap) => gap.suggestedWords));
  scriptFitValue.textContent = words + "/" + bestWords;
  renderScriptReview();
}

function getGapScriptFit(gap) {
  const gapScript = getScriptForGap(gap);
  const usableDuration = Math.max(0, gap.duration - Number(paddingInput.value));
  const requiredWps = gapScript.words && usableDuration > 0 ? gapScript.words / usableDuration : 0;
  const delta = gap.suggestedWords - gapScript.words;
  return {
    ...gapScript,
    usableDuration,
    requiredWps,
    delta,
    fits: gapScript.words > 0 && delta >= 0,
    hasScript: gapScript.words > 0,
  };
}

function findBestGapForScriptItem(item) {
  const gaps = lastAnalysis?.gaps || [];
  if (!gaps.length) return null;
  if (item.singleTimestamp) {
    const timedMatch = gaps.find((gap) => item.start >= gap.start - 0.35 && item.start <= gap.end + 0.35);
    if (!timedMatch) return null;
    return {
      gap: timedMatch,
      index: gaps.indexOf(timedMatch),
      overlap: Math.max(0.1, Math.min(timedMatch.end, getScriptItemPlaybackEnd(item)) - item.start),
    };
  }

  const overlaps = gaps
    .map((gap, index) => ({
      gap,
      index,
      overlap: Math.max(0, Math.min(gap.end, getScriptItemPlaybackEnd(item)) - Math.max(gap.start, item.start)),
    }))
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap);
  return overlaps[0] || null;
}

function getScriptItemPlaybackEnd(item) {
  const cueSeconds = Number(speechRateInput.value) > 0 ? item.words / Number(speechRateInput.value) : 0;
  if (item.singleTimestamp) return item.start + cueSeconds;
  return item.windowEnd ?? item.end;
}

function getScriptItemFit(item) {
  const match = findBestGapForScriptItem(item);
  const padding = Number(paddingInput.value);
  const cueSeconds = Number(speechRateInput.value) > 0 ? item.words / Number(speechRateInput.value) : 0;
  const itemEnd = getScriptItemPlaybackEnd(item);
  if (!match) {
    return {
      gap: null,
      index: -1,
      cueSeconds,
      requiredWps: item.words / Math.max(0.1, itemEnd - item.start),
      status: "No matching no-dialogue gap",
      fits: false,
      risk: true,
    };
  }

  const usableDuration = Math.max(0, match.gap.duration - padding);
  const requiredWps = item.words / Math.max(0.1, usableDuration);
  const fullyInsideGap = item.start >= match.gap.start - 0.05 && itemEnd <= match.gap.end + 0.05;
  const fits = item.words <= match.gap.suggestedWords && fullyInsideGap;
  const status = fits
    ? "Fits gap " + (match.index + 1)
    : fullyInsideGap
      ? "Needs " + requiredWps.toFixed(1) + " wps"
      : "May step on dialogue near gap " + (match.index + 1);
  return {
    gap: match.gap,
    index: match.index,
    cueSeconds,
    requiredWps,
    status,
    fits,
    risk: !fits,
  };
}

function scrollWaveformToTime(time) {
  const wrapper = waveformCanvas.parentElement;
  const duration = lastAudioDuration || 0;
  if (!wrapper || !duration) return;

  const rect = waveformCanvas.getBoundingClientRect();
  const targetX = (time / duration) * rect.width;
  wrapper.scrollLeft = Math.max(0, targetX - wrapper.clientWidth * 0.35);
}

function followWaveformPlayhead() {
  if (!waveformFollowToggle.checked || !lastAudioDuration) return;
  const wrapper = waveformCanvas.parentElement;
  if (!wrapper || wrapper.scrollWidth <= wrapper.clientWidth) return;

  const rect = waveformCanvas.getBoundingClientRect();
  const styleWidth = rect.width;
  const padLeft = 56;
  const padRight = 18;
  const plotWidth = Math.max(1, styleWidth - padLeft - padRight);
  const playheadX = padLeft + ((Number(videoPreview.currentTime) || 0) / lastAudioDuration) * plotWidth;
  const visibleStart = wrapper.scrollLeft;
  const visibleEnd = visibleStart + wrapper.clientWidth;
  const guard = Math.min(140, Math.max(48, wrapper.clientWidth * 0.18));

  if (playheadX > visibleEnd - guard) {
    wrapper.scrollLeft = Math.min(wrapper.scrollWidth - wrapper.clientWidth, playheadX - wrapper.clientWidth * 0.35);
  } else if (playheadX < visibleStart + guard) {
    wrapper.scrollLeft = Math.max(0, playheadX - wrapper.clientWidth * 0.35);
  }
}

function navigateToTime(time, play = true) {
  if (Number.isFinite(time)) {
    videoPreview.currentTime = Math.max(0, time);
  }
  scrollWaveformToTime(Number(videoPreview.currentTime) || time || 0);
  if (play) videoPreview.play().catch(() => {});
  updatePlaybackIndicators();
}

function makeReviewItem({ title, meta, copy, risk = false, ok = false, onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "review-item" + (risk ? " risk" : "") + (ok ? " ok" : "");
  button.addEventListener("click", onClick);

  const titleEl = document.createElement("span");
  titleEl.className = "review-title";
  titleEl.textContent = title;
  const metaEl = document.createElement("span");
  metaEl.className = "review-meta";
  metaEl.textContent = meta;
  button.append(titleEl, metaEl);

  if (copy) {
    const copyEl = document.createElement("span");
    copyEl.className = "review-copy";
    copyEl.textContent = copy;
    button.append(copyEl);
  }

  return button;
}

function renderScriptReview() {
  scriptCueList.innerHTML = "";
  missingScriptGapList.innerHTML = "";

  if (!scriptItems.length) {
    scriptCueSummary.textContent = "No timed cues";
    const empty = document.createElement("div");
    empty.className = "empty-row";
    empty.textContent = cleanScriptText(scriptInput.value) ? "Untimed script text is checked against each gap." : "Paste or load a script.";
    scriptCueList.append(empty);
  } else {
    let riskyCount = 0;
    scriptItems.forEach((item) => {
      const fit = getScriptItemFit(item);
      riskyCount += fit.risk ? 1 : 0;
      const recommendation = fit.gap
        ? "Gap " + (fit.index + 1) + ", " + item.words + " words, recommend " + fit.requiredWps.toFixed(1) + " wps or slower"
        : item.words + " words, no detected gap";
      const button = makeReviewItem({
        title: item.singleTimestamp
          ? formatTimestamp(item.start)
          : formatTimestamp(item.start) + " - " + formatTimestamp(item.end),
        meta: fit.status + ". " + recommendation + ".",
        copy: item.text,
        risk: fit.risk,
        ok: fit.fits,
        onClick: () => navigateToTime(fit.gap ? fit.gap.start : item.start),
      });
      button.dataset.scriptItemId = item.id;
      scriptCueList.append(button);
    });
    scriptCueSummary.textContent = scriptItems.length + " cues, " + riskyCount + " risk" + (riskyCount === 1 ? "" : "s");
  }

  const gaps = lastAnalysis?.gaps || [];
  const missingGaps = gaps
    .map((gap, index) => ({ gap, index, fit: getGapScriptFit(gap) }))
    .filter((entry) => !entry.fit.hasScript);
  missingScriptSummary.textContent = missingGaps.length + " gap" + (missingGaps.length === 1 ? "" : "s");

  if (!missingGaps.length) {
    const empty = document.createElement("div");
    empty.className = "empty-row";
    empty.textContent = gaps.length ? "Every detected gap has matching script text." : "Analyze audio to list missing-script gaps.";
    missingScriptGapList.append(empty);
    return;
  }

  missingGaps.forEach(({ gap, index }) => {
    missingScriptGapList.append(makeReviewItem({
      title: "Gap " + (index + 1) + ": " + formatTimestamp(gap.start) + " - " + formatTimestamp(gap.end),
      meta: gap.duration.toFixed(2) + "s, " + gap.suggestedWords + " words available",
      copy: gap.label,
      onClick: () => navigateToTime(gap.start),
    }));
  });
}

async function saveScript() {
  const scriptText = scriptInput.value;
  const suggestedName = loadedScriptFileName || "audio-description-script.txt";

  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: "Text files",
          accept: { "text/plain": [".txt", ".srt", ".vtt"] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(scriptText);
      await writable.close();
      loadedScriptFileName = handle.name || suggestedName;
      setAdStatus("Saved script as " + loadedScriptFileName + ".");
      return;
    } catch (error) {
      if (error.name === "AbortError") {
        setAdStatus("Script save canceled.");
        return;
      }
    }
  }

  const link = document.createElement("a");
  link.download = suggestedName;
  link.href = URL.createObjectURL(new Blob([scriptText], { type: "text/plain" }));
  link.click();
  URL.revokeObjectURL(link.href);
  setAdStatus("Downloaded edited script as " + suggestedName + ".");
}

function dbFromRms(rms) {
  return 20 * Math.log10(Math.max(rms, 0.000001));
}

function summarizeDb(values, key) {
  if (!values.length) return -120;
  const total = values.reduce((sum, item) => sum + item[key], 0);
  return total / values.length;
}

function percentile(values, amount) {
  if (!values.length) return -120;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * amount)));
  return sorted[index];
}

function getCutoffDetails(frames) {
  const baseCutoff = Number(silenceThresholdInput.value);
  const musicBedDb = percentile(frames.map((frame) => frame.voiceDb), 0.2);
  const adaptiveCutoff = musicBedDb + Number(speechLiftInput.value);
  const threshold = Math.max(baseCutoff, adaptiveCutoff);
  const source = threshold === baseCutoff ? "base cutoff" : "music cutoff";
  return { baseCutoff, musicBedDb, adaptiveCutoff, threshold, source };
}

function updateCutoffStatus(details = null) {
  if (!details) {
    cutoffStatusText.textContent = "Active cutoff appears after analysis.";
    return;
  }

  cutoffStatusText.textContent = "Active cutoff " + details.threshold.toFixed(1) + " dB from " + details.source + ". Base " + details.baseCutoff.toFixed(1) + " dB; music " + details.musicBedDb.toFixed(1) + " dB + lift = " + details.adaptiveCutoff.toFixed(1) + " dB.";
}

function fitCanvasToDisplay(canvas) {
  const pixelRatio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width * pixelRatio));
  const height = Math.max(1, Math.floor(rect.height * pixelRatio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  return { width, height, pixelRatio };
}

function refreshWaveformZoom() {
  const zoom = Number(waveformZoomInput.value);
  waveformZoomValue.textContent = zoom.toFixed(zoom % 1 ? 1 : 0) + "x";
  waveformCanvas.style.width = (zoom * 100) + "%";
}

function drawLine(ctx, points, color, xForTime, yForDb) {
  if (!points.length) return;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = xForTime((point.start + point.end) / 2);
    const y = yForDb(point.value);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawHorizontalGuide(ctx, y, label, color, left, right) {
  ctx.save();
  ctx.setLineDash([7, 5]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  ctx.font = "12px Arial, Helvetica, sans-serif";
  ctx.fillText(label, left + 8, y - 6);
  ctx.restore();
}

function drawWaveform(frames = lastAudioFrames, analysis = null) {
  refreshWaveformZoom();
  const { width, height, pixelRatio } = fitCanvasToDisplay(waveformCanvas);
  const ctx = waveformCtx;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);

  const padLeft = 56 * pixelRatio;
  const padRight = 18 * pixelRatio;
  const padTop = 18 * pixelRatio;
  const padBottom = 34 * pixelRatio;
  const plotLeft = padLeft;
  const plotRight = width - padRight;
  const plotTop = padTop;
  const plotBottom = height - padBottom;
  const minDb = -80;
  const maxDb = 0;
  const duration = lastAudioDuration || frames.at(-1)?.end || 1;
  waveformGapRegions = [];

  const xForTime = (time) => plotLeft + (Math.max(0, Math.min(duration, time)) / duration) * (plotRight - plotLeft);
  const yForDb = (db) => plotBottom - ((Math.max(minDb, Math.min(maxDb, db)) - minDb) / (maxDb - minDb)) * (plotBottom - plotTop);

  ctx.strokeStyle = "#d7dde6";
  ctx.lineWidth = 1;
  ctx.font = (12 * pixelRatio) + "px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#404b59";

  for (let db = minDb; db <= maxDb; db += 20) {
    const y = yForDb(db);
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    ctx.fillText(db + " dB", 8 * pixelRatio, y + 4 * pixelRatio);
  }

  const timeStep = duration > 180 ? 60 : duration > 60 ? 30 : 10;
  for (let time = 0; time <= duration; time += timeStep) {
    const x = xForTime(time);
    ctx.beginPath();
    ctx.moveTo(x, plotBottom);
    ctx.lineTo(x, plotBottom + 5 * pixelRatio);
    ctx.stroke();
    ctx.fillText(formatTimestamp(time), x - 18 * pixelRatio, plotBottom + 22 * pixelRatio);
  }

  if (!frames.length) {
    ctx.fillStyle = "#404b59";
    ctx.textAlign = "center";
    ctx.fillText("Analyze a video or audio file to draw dB levels.", width / 2, height / 2);
    ctx.textAlign = "start";
    return;
  }

  if (analysis?.gaps?.length) {
    getScriptStats();
    for (const gap of analysis.gaps) {
      const x = xForTime(gap.start);
      const gapWidth = Math.max(1, xForTime(gap.end) - x);
      const gapScript = getScriptForGap(gap);
      const isScriptFit = gapScript.words > 0 && gap.suggestedWords >= gapScript.words;
      const isGoodGap = gap.suggestedWords >= 8 || isScriptFit;
      ctx.fillStyle = isScriptFit
        ? "rgba(13, 107, 49, 0.32)"
        : isGoodGap
          ? "rgba(13, 107, 49, 0.22)"
          : "rgba(13, 107, 116, 0.12)";
      ctx.fillRect(x, plotTop, gapWidth, plotBottom - plotTop);
      if (isGoodGap) {
        ctx.strokeStyle = isScriptFit ? "#084c24" : "#084e55";
        ctx.lineWidth = 1.5 * pixelRatio;
        ctx.strokeRect(x, plotTop, gapWidth, plotBottom - plotTop);
      }
      waveformGapRegions.push({
        x: x / pixelRatio,
        y: plotTop / pixelRatio,
        width: gapWidth / pixelRatio,
        height: (plotBottom - plotTop) / pixelRatio,
        gap,
        isGoodGap,
        isScriptFit,
      });
    }

    if (scriptItems.length) {
      for (const item of scriptItems) {
        const fit = getScriptItemFit(item);
        if (!fit.risk) continue;
        const x = xForTime(item.start);
        const cueWidth = Math.max(2, xForTime(getScriptItemPlaybackEnd(item)) - x);
        ctx.fillStyle = "rgba(192, 59, 43, 0.20)";
        ctx.fillRect(x, plotTop, cueWidth, plotBottom - plotTop);
        ctx.strokeStyle = "#8b261d";
        ctx.lineWidth = 1.5 * pixelRatio;
        ctx.strokeRect(x, plotTop, cueWidth, plotBottom - plotTop);
      }
    }
  }
  window.__waveformGapRegionsForTest = waveformGapRegions;

  drawLine(ctx, frames.map((frame) => ({ ...frame, value: frame.fullDb })), "#5f6b79", xForTime, yForDb);
  drawLine(ctx, frames.map((frame) => ({ ...frame, value: frame.voiceDb })), "#084e55", xForTime, yForDb);

  if (analysis) {
    drawHorizontalGuide(ctx, yForDb(analysis.musicBedDb), "music bed " + analysis.musicBedDb.toFixed(1) + " dB", "#404b59", plotLeft, plotRight);
    drawHorizontalGuide(ctx, yForDb(analysis.threshold), "cutoff " + analysis.threshold.toFixed(1) + " dB", "#8b261d", plotLeft, plotRight);
  }

  if (Number.isFinite(videoPreview.currentTime) && duration > 0) {
    const playheadX = xForTime(videoPreview.currentTime);
    ctx.strokeStyle = "#15202b";
    ctx.lineWidth = 2 * pixelRatio;
    ctx.beginPath();
    ctx.moveTo(playheadX, plotTop);
    ctx.lineTo(playheadX, plotBottom);
    ctx.stroke();
    ctx.fillStyle = "#15202b";
    ctx.beginPath();
    ctx.moveTo(playheadX, plotTop);
    ctx.lineTo(playheadX - 6 * pixelRatio, plotTop - 8 * pixelRatio);
    ctx.lineTo(playheadX + 6 * pixelRatio, plotTop - 8 * pixelRatio);
    ctx.closePath();
    ctx.fill();
  }
}

function updatePlaybackIndicators() {
  const time = Number(videoPreview.currentTime) || 0;
  let nextActiveGapIndex = -1;

  for (const item of currentGapRows) {
    const isActive = time >= item.gap.start && time <= item.gap.end;
    item.row.classList.toggle("active-gap", isActive);
    if (isActive) {
      nextActiveGapIndex = Number(item.row.dataset.gapIndex);
    }
  }

  activeGapIndex = nextActiveGapIndex;

  for (const button of scriptCueList.querySelectorAll("[data-script-item-id]")) {
    const item = scriptItems.find((scriptItem) => scriptItem.id === button.dataset.scriptItemId);
    button.classList.toggle("active-cue", Boolean(item && time >= item.start && time <= item.end));
  }

  followWaveformPlayhead();

  if (lastAudioFrames.length) {
    drawWaveform(lastAudioFrames, lastAnalysis);
  }
  handleTtsPlayback();
}

function formatScriptFitForGap(gap) {
  const { words, seconds } = getScriptForGap(gap);
  if (!words) return "No script loaded";
  const delta = gap.suggestedWords - words;
  return delta >= 0
    ? "Script fits with " + delta + " word" + (delta === 1 ? "" : "s") + " spare (" + seconds.toFixed(1) + "s est.)"
    : "Script is " + Math.abs(delta) + " word" + (Math.abs(delta) === 1 ? "" : "s") + " over (" + seconds.toFixed(1) + "s est.)";
}

function showWaveformTooltip(region, event) {
  waveformTooltip.innerHTML = "";
  const title = document.createElement("strong");
  title.textContent = formatTimestamp(region.gap.start) + " - " + formatTimestamp(region.gap.end);
  const details = document.createElement("div");
  details.textContent = region.gap.duration.toFixed(2) + "s, " + region.gap.suggestedWords + " AD words";
  const fit = document.createElement("div");
  fit.textContent = formatScriptFitForGap(region.gap);
  waveformTooltip.append(title, details, fit);

  const wrapRect = waveformCanvas.parentElement.getBoundingClientRect();
  const maxTooltipX = Math.max(8, wrapRect.width - 272);
  const tooltipX = Math.min(maxTooltipX, Math.max(8, event.clientX - wrapRect.left + 12));
  const tooltipY = Math.max(8, event.clientY - wrapRect.top - 58);
  waveformTooltip.style.left = tooltipX + "px";
  waveformTooltip.style.top = tooltipY + "px";
  waveformTooltip.classList.remove("hidden");
}

function handleWaveformPointerMove(event) {
  const rect = waveformCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const region = waveformGapRegions.find((item) => (
    x >= item.x
    && x <= item.x + item.width
    && y >= item.y
    && y <= item.y + item.height
  ));

  waveformCanvas.style.cursor = region ? "pointer" : "default";
  if (region) {
    showWaveformTooltip(region, event);
  } else {
    waveformTooltip.classList.add("hidden");
  }
}

function seekWaveformGap(event) {
  const rect = waveformCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const region = waveformGapRegions.find((item) => (
    x >= item.x
    && x <= item.x + item.width
    && y >= item.y
    && y <= item.y + item.height
  ));

  if (!region) return;
  videoPreview.currentTime = region.gap.start;
  videoPreview.play().catch(() => {});
  updatePlaybackIndicators();
}

function refreshTtsRate() {
  const rate = Number(ttsRateInput.value) || 1;
  ttsRateValue.textContent = rate.toFixed(rate % 1 ? 1 : 0) + "x";
}

function populateTtsVoices() {
  if (!("speechSynthesis" in window)) {
    ttsVoiceSelect.disabled = true;
    return;
  }

  const currentValue = ttsVoiceSelect.value;
  const voices = window.speechSynthesis.getVoices();
  ttsVoiceSelect.innerHTML = '<option value="">System default</option>';
  voices.forEach((voice) => {
    const option = document.createElement("option");
    option.value = voice.voiceURI;
    option.textContent = voice.name + (voice.lang ? " (" + voice.lang + ")" : "");
    ttsVoiceSelect.append(option);
  });

  if ([...ttsVoiceSelect.options].some((option) => option.value === currentValue)) {
    ttsVoiceSelect.value = currentValue;
  }
}

function getSelectedTtsVoice() {
  if (!("speechSynthesis" in window) || !ttsVoiceSelect.value) return null;
  return window.speechSynthesis.getVoices().find((voice) => voice.voiceURI === ttsVoiceSelect.value) || null;
}

function speakText(text, options = {}) {
  if (!("speechSynthesis" in window) || !text.trim()) return;
  window.speechSynthesis.cancel();
  window.__lastSpokenTextForTest = text.trim();
  const utterance = new SpeechSynthesisUtterance(text.trim());
  const selectedVoice = getSelectedTtsVoice();
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.rate = Math.max(0.5, Math.min(2, Number(ttsRateInput.value) || 1));
  utterance.pitch = 1;
  if (options.resumeVideo) {
    utterance.addEventListener("end", () => {
      isExtendedAdPause = false;
      if (ttsSyncToggle.checked && extendedAdToggle.checked && !videoPreview.ended) {
        isResumingAfterExtendedAd = true;
        videoPreview.play().catch(() => {});
      }
    });
    utterance.addEventListener("error", () => {
      isExtendedAdPause = false;
    });
  }
  window.speechSynthesis.speak(utterance);
}

window.__runTtsPlaybackForTest = handleTtsPlayback;

function resetUpcomingTts() {
  const currentTime = Number(videoPreview.currentTime) || 0;
  const nextSpokenIds = new Set([...spokenScriptItemIds].filter((id) => {
    const item = scriptItems.find((scriptItem) => scriptItem.id === id);
    return item && item.start < currentTime;
  }));
  scriptItems.forEach((item) => {
    if (item.start < currentTime - 0.25) nextSpokenIds.add(item.id);
  });
  spokenScriptItemIds = nextSpokenIds;
  lastTtsPlaybackTime = currentTime;
}

function resetTtsTimelineToCurrentPosition() {
  spokenScriptItemIds.clear();
  scriptItems = parseScriptItems(scriptInput.value);
  resetUpcomingTts();
}

function handleTtsPlayback() {
  if (!ttsSyncToggle.checked || videoPreview.paused || videoPreview.ended) return;

  const currentTime = Number(videoPreview.currentTime) || 0;
  scriptItems = parseScriptItems(scriptInput.value);
  if (scriptItems.length) {
    scriptItems.forEach((item) => {
      if (item.start < currentTime - 1.25) spokenScriptItemIds.add(item.id);
    });
    const priorTime = Math.min(lastTtsPlaybackTime, currentTime);
    const cue = scriptItems.find((item) => (
      item.start >= Math.max(0, priorTime - 0.1)
      && item.start <= currentTime + 0.35
      && currentTime - item.start <= 1.25
      && !spokenScriptItemIds.has(item.id)
    ));
    lastTtsPlaybackTime = currentTime;
    if (cue) {
      spokenScriptItemIds.add(cue.id);
      window.__lastTtsCueForTest = cue;
      if (extendedAdToggle.checked) {
        isExtendedAdPause = true;
        videoPreview.pause();
        speakText(cue.text, { resumeVideo: true });
      } else {
        speakText(cue.text);
      }
    }
    return;
  }

  if (scriptHasTimestamp(scriptInput.value) || extendedAdToggle.checked) return;

  const gapRegion = currentGapRows.find((item) => (
    currentTime >= item.gap.start
    && currentTime <= item.gap.end
  ));
  if (!gapRegion) return;

  const id = "gap-" + gapRegion.gap.start + "-" + gapRegion.gap.end;
  if (!spokenScriptItemIds.has(id)) {
    spokenScriptItemIds.add(id);
    const text = cleanScriptText(scriptInput.value);
    if (extendedAdToggle.checked) {
      isExtendedAdPause = true;
      videoPreview.pause();
      speakText(text, { resumeVideo: true });
    } else {
      speakText(text);
    }
  }
}

function renderGapRows(gaps) {
  gapResults.innerHTML = "";
  currentGapRows = [];
  activeGapIndex = -1;
  getScriptStats();

  if (!gaps.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6" class="empty-row">No usable gaps found with the current thresholds.</td>';
    gapResults.append(row);
    renderScriptReview();
    return;
  }

  gaps.forEach((gap, index) => {
    const row = document.createElement("tr");
    row.dataset.gapIndex = String(index);
    row.addEventListener("click", () => navigateToTime(gap.start));
    const gapNumber = document.createElement("td");
    gapNumber.textContent = String(index + 1);

    const windowCell = document.createElement("td");
    windowCell.textContent = formatTimestamp(gap.start) + " - " + formatTimestamp(gap.end);

    const durationCell = document.createElement("td");
    durationCell.textContent = gap.duration.toFixed(2) + "s";

    const suggestionCell = document.createElement("td");
    const wordCount = document.createElement("strong");
    wordCount.textContent = gap.suggestedWords + " words";
    const label = document.createElement("span");
    label.textContent = gap.label;
    suggestionCell.append(wordCount, document.createElement("br"), label);

    const fitCell = document.createElement("td");
    const fitValue = document.createElement("span");
    const gapScript = getGapScriptFit(gap);
    row.classList.toggle("gap-script-missing", !gapScript.hasScript);
    row.classList.toggle("gap-script-risk", gapScript.hasScript && !gapScript.fits);
    fitValue.className = !gapScript.hasScript || gapScript.fits ? "fit-pass" : "fit-fail";
    fitValue.textContent = gapScript.hasScript
      ? gapScript.fits
        ? "Fits, " + gapScript.delta + " spare"
        : Math.abs(gapScript.delta) + " over"
      : "No script";
    const durationNote = document.createElement("span");
    durationNote.textContent = gapScript.hasScript
      ? gapScript.words + " words, " + gapScript.seconds.toFixed(1) + "s est., " + gapScript.requiredWps.toFixed(1) + " wps needed"
      : "Paste or load copy";
    fitCell.append(fitValue, document.createElement("br"), durationNote);

    const contextCell = document.createElement("td");
    const voiceLabel = document.createElement("span");
    voiceLabel.className = "context-label";
    voiceLabel.textContent = "Voice";
    const voiceText = document.createTextNode(" " + gap.avgVoiceDb.toFixed(1) + " dB");
    const mixLabel = document.createElement("span");
    mixLabel.className = "context-label";
    mixLabel.textContent = "Mix";
    const mixText = document.createTextNode(" " + gap.avgFullDb.toFixed(1) + " dB");
    contextCell.append(voiceLabel, voiceText, document.createElement("br"), mixLabel, mixText);

    row.append(gapNumber, windowCell, durationCell, suggestionCell, fitCell, contextCell);
    gapResults.append(row);
    currentGapRows.push({ row, gap });
  });
  renderScriptReview();
  updatePlaybackIndicators();
}

function downmixAudio(audioBuffer) {
  const output = new Float32Array(audioBuffer.length);
  for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
    const channel = audioBuffer.getChannelData(channelIndex);
    for (let index = 0; index < channel.length; index += 1) {
      output[index] += channel[index] / audioBuffer.numberOfChannels;
    }
  }
  return output;
}

async function filterVoiceBand(monoData, sampleRate) {
  const offlineContext = new OfflineAudioContext(1, monoData.length, sampleRate);
  const sourceBuffer = offlineContext.createBuffer(1, monoData.length, sampleRate);
  sourceBuffer.copyToChannel(monoData, 0);

  const source = offlineContext.createBufferSource();
  const highpass = offlineContext.createBiquadFilter();
  const lowpass = offlineContext.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 120;
  lowpass.type = "lowpass";
  lowpass.frequency.value = 3800;
  source.buffer = sourceBuffer;
  source.connect(highpass).connect(lowpass).connect(offlineContext.destination);
  source.start();

  const rendered = await offlineContext.startRendering();
  return rendered.getChannelData(0);
}

function measureFrames(fullData, voiceData, sampleRate) {
  const frameSize = Math.max(1, Math.floor(sampleRate * 0.1));
  const frames = [];

  for (let startSample = 0; startSample < fullData.length; startSample += frameSize) {
    const endSample = Math.min(fullData.length, startSample + frameSize);
    let fullSum = 0;
    let voiceSum = 0;

    for (let index = startSample; index < endSample; index += 1) {
      fullSum += fullData[index] * fullData[index];
      voiceSum += voiceData[index] * voiceData[index];
    }

    const sampleCount = Math.max(1, endSample - startSample);
    frames.push({
      start: startSample / sampleRate,
      end: endSample / sampleRate,
      fullDb: dbFromRms(Math.sqrt(fullSum / sampleCount)),
      voiceDb: dbFromRms(Math.sqrt(voiceSum / sampleCount)),
    });
  }

  return frames;
}

function findLowSpeechGaps(frames) {
  const cutoffDetails = getCutoffDetails(frames);
  const { threshold, musicBedDb } = cutoffDetails;
  const minGap = Number(minGapInput.value);
  const speechRate = Number(speechRateInput.value);
  const padding = Number(paddingInput.value);
  const gaps = [];
  let activeFrames = [];

  const flushGap = () => {
    if (!activeFrames.length) return;
    const start = activeFrames[0].start;
    const end = activeFrames[activeFrames.length - 1].end;
    const duration = end - start;
    if (duration >= minGap) {
      const usableDuration = Math.max(0, duration - padding);
      const suggestedWords = Math.max(0, Math.floor(usableDuration * speechRate));
      gaps.push({
        start,
        end,
        duration,
        suggestedWords,
        label: classifyGap(suggestedWords, duration),
        avgVoiceDb: summarizeDb(activeFrames, "voiceDb"),
        avgFullDb: summarizeDb(activeFrames, "fullDb"),
      });
    }
    activeFrames = [];
  };

  for (const frame of frames) {
    if (frame.voiceDb <= threshold) {
      activeFrames.push(frame);
    } else {
      flushGap();
    }
  }
  flushGap();
  updateCutoffStatus(cutoffDetails);
  return { gaps, threshold, musicBedDb };
}

function rerunCurrentAudioSettings() {
  updateScriptStats();
  if (!lastAudioFrames.length) return;

  if (noDialogueToggle.checked) {
    const duration = lastAudioDuration;
    const usableDuration = Math.max(0, duration - Number(paddingInput.value));
    const gaps = [{
      start: 0,
      end: duration,
      duration,
      suggestedWords: Math.max(0, Math.floor(usableDuration * Number(speechRateInput.value))),
      label: "Full no-dialogue bed",
      avgVoiceDb: summarizeDb(lastAudioFrames, "voiceDb"),
      avgFullDb: summarizeDb(lastAudioFrames, "fullDb"),
    }];
    const analysis = {
      gaps,
      ...getCutoffDetails(lastAudioFrames),
    };
    updateCutoffStatus(analysis);
    lastAnalysis = analysis;
    updateGapSummary(gaps);
    renderGapRows(gaps);
    drawWaveform(lastAudioFrames, analysis);
    setAdStatus("Marked the full " + formatTimestamp(duration) + " runtime as available because Treat as no dialogue is on.");
    return;
  }

  const analysis = findLowSpeechGaps(lastAudioFrames);
  lastAnalysis = analysis;
  updateGapSummary(analysis.gaps);
  renderGapRows(analysis.gaps);
  drawWaveform(lastAudioFrames, analysis);
  if (analysis.gaps.length) {
    setAdStatus("Rechecked settings. Estimated music bed " + analysis.musicBedDb.toFixed(1) + " dB; speech cutoff " + analysis.threshold.toFixed(1) + " dB.");
  } else {
    setAdStatus("No openings with current settings. Estimated music bed " + analysis.musicBedDb.toFixed(1) + " dB; speech cutoff " + analysis.threshold.toFixed(1) + " dB.");
  }
}

function resetGapSummary() {
  lastAudioFrames = [];
  lastAudioDuration = 0;
  lastAnalysis = null;
  currentGapRows = [];
  gapCount.textContent = "0";
  totalGapTime.textContent = "0.0s";
  maxSuggestedWords.textContent = "0";
  updateCutoffStatus();
  updateScriptStats();
  drawWaveform([], null);
}

function updateGapSummary(gaps) {
  gapCount.textContent = String(gaps.length);
  totalGapTime.textContent = gaps.reduce((sum, gap) => sum + gap.duration, 0).toFixed(1) + "s";
  maxSuggestedWords.textContent = String(Math.max(0, ...gaps.map((gap) => gap.suggestedWords)));
  updateScriptStats();
}

async function decodeAudioFromBuffer(arrayBuffer) {
  const decodeContext = new OfflineAudioContext(1, 1, 44100);
  return decodeContext.decodeAudioData(arrayBuffer.slice(0));
}

function getTsPayload(packet, packetStart) {
  const adaptationFieldControl = (packet[packetStart + 3] >> 4) & 3;
  if (adaptationFieldControl === 0 || adaptationFieldControl === 2) return null;

  let payloadStart = packetStart + 4;
  if (adaptationFieldControl === 3) {
    payloadStart += 1 + packet[packetStart + 4];
  }

  if (payloadStart >= packetStart + 188) return null;
  return packet.subarray(payloadStart, packetStart + 188);
}

function parseTsSection(payload) {
  if (!payload?.length) return null;
  const pointer = payload[0] || 0;
  const sectionStart = 1 + pointer;
  if (sectionStart + 3 > payload.length) return null;
  const sectionLength = ((payload[sectionStart + 1] & 0x0f) << 8) | payload[sectionStart + 2];
  if (sectionStart + 3 + sectionLength > payload.length) return null;
  return payload.subarray(sectionStart, sectionStart + 3 + sectionLength);
}

function findTsAudioPids(bytes) {
  const audioPids = new Set();
  const pmtPids = new Set();

  for (let offset = 0; offset + 188 <= bytes.length; offset += 188) {
    if (bytes[offset] !== 0x47) continue;
    const pid = ((bytes[offset + 1] & 0x1f) << 8) | bytes[offset + 2];
    const payloadUnitStart = Boolean(bytes[offset + 1] & 0x40);
    if (!payloadUnitStart) continue;
    const payload = getTsPayload(bytes, offset);
    if (!payload) continue;

    if (pid === 0) {
      const section = parseTsSection(payload);
      if (!section || section[0] !== 0x00) continue;
      const sectionLength = ((section[1] & 0x0f) << 8) | section[2];
      const entryEnd = 3 + sectionLength - 4;
      for (let index = 8; index + 4 <= entryEnd; index += 4) {
        const programNumber = (section[index] << 8) | section[index + 1];
        if (programNumber) {
          pmtPids.add(((section[index + 2] & 0x1f) << 8) | section[index + 3]);
        }
      }
      continue;
    }

    if (pmtPids.has(pid)) {
      const section = parseTsSection(payload);
      if (!section || section[0] !== 0x02) continue;
      const sectionLength = ((section[1] & 0x0f) << 8) | section[2];
      const programInfoLength = ((section[10] & 0x0f) << 8) | section[11];
      let index = 12 + programInfoLength;
      const entryEnd = 3 + sectionLength - 4;
      while (index + 5 <= entryEnd) {
        const streamType = section[index];
        const elementaryPid = ((section[index + 1] & 0x1f) << 8) | section[index + 2];
        const esInfoLength = ((section[index + 3] & 0x0f) << 8) | section[index + 4];
        if ([0x03, 0x04, 0x0f, 0x11].includes(streamType)) {
          audioPids.add(elementaryPid);
        }
        index += 5 + esInfoLength;
      }
    }
  }

  return audioPids;
}

function extractAudioFromTsSegment(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length < 188 || bytes[0] !== 0x47) return null;

  const audioPids = findTsAudioPids(bytes);
  if (!audioPids.size) return null;

  const chunks = [];
  for (let offset = 0; offset + 188 <= bytes.length; offset += 188) {
    if (bytes[offset] !== 0x47) continue;
    const pid = ((bytes[offset + 1] & 0x1f) << 8) | bytes[offset + 2];
    if (!audioPids.has(pid)) continue;

    const payload = getTsPayload(bytes, offset);
    if (!payload?.length) continue;

    const payloadUnitStart = Boolean(bytes[offset + 1] & 0x40);
    if (payloadUnitStart && payload.length > 9 && payload[0] === 0x00 && payload[1] === 0x00 && payload[2] === 0x01) {
      const headerLength = 9 + payload[8];
      if (headerLength < payload.length) {
        chunks.push(payload.subarray(headerLength));
      }
    } else if (!payloadUnitStart) {
      chunks.push(payload);
    }
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (!totalLength) return null;

  const audioBytes = new Uint8Array(totalLength);
  let writeOffset = 0;
  for (const chunk of chunks) {
    audioBytes.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }

  return audioBytes.buffer;
}

function waitForMediaMetadata(mediaElement) {
  if (Number.isFinite(mediaElement.duration) && mediaElement.duration > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      mediaElement.removeEventListener("loadedmetadata", handleLoaded);
      mediaElement.removeEventListener("error", handleError);
    };
    const handleLoaded = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("metadata-failed"));
    };
    mediaElement.addEventListener("loadedmetadata", handleLoaded, { once: true });
    mediaElement.addEventListener("error", handleError, { once: true });
    mediaElement.load();
  });
}

async function capturePlayableMediaAudio(sourceName) {
  const captureStream = videoPreview.captureStream || videoPreview.mozCaptureStream;
  if (!captureStream) {
    throw new Error("capture-not-supported");
  }

  await waitForMediaMetadata(videoPreview);
  const duration = Number(videoPreview.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("duration-unavailable");
  }

  const audioContext = new AudioContext();
  const stream = captureStream.call(videoPreview);
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 2, 1);
  const silentGain = audioContext.createGain();
  const chunks = [];
  let sampleCount = 0;

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer;
    const frameCount = input.length;
    const mixed = new Float32Array(frameCount);
    const channels = Math.max(1, input.numberOfChannels);
    for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
      const channel = input.getChannelData(channelIndex);
      for (let index = 0; index < frameCount; index += 1) {
        mixed[index] += channel[index] / channels;
      }
    }
    chunks.push(mixed);
    sampleCount += frameCount;
  };

  silentGain.gain.value = 0;
  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(audioContext.destination);

  const originalMuted = videoPreview.muted;
  const originalPlaybackRate = videoPreview.playbackRate;
  const originalCurrentTime = videoPreview.currentTime;
  const originalPreservesPitch = videoPreview.preservesPitch;

  videoPreview.muted = true;
  videoPreview.playbackRate = 4;
  if ("preservesPitch" in videoPreview) videoPreview.preservesPitch = false;
  videoPreview.currentTime = 0;
  try {
    await audioContext.resume();

    setAdStatus("Direct segment decode failed. Capturing playable video audio at 4x speed...");
    await videoPreview.play();
    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("capture-timeout"));
      }, Math.max(20000, (duration / Math.max(0.25, videoPreview.playbackRate)) * 1000 + 12000));
      const cleanup = () => {
        window.clearTimeout(timeout);
        videoPreview.removeEventListener("ended", handleEnded);
        videoPreview.removeEventListener("error", handleError);
      };
      const handleEnded = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error("capture-playback-failed"));
      };
      videoPreview.addEventListener("ended", handleEnded, { once: true });
      videoPreview.addEventListener("error", handleError, { once: true });
    });
  } finally {
    videoPreview.pause();
    videoPreview.muted = originalMuted;
    videoPreview.playbackRate = originalPlaybackRate;
    if ("preservesPitch" in videoPreview) videoPreview.preservesPitch = originalPreservesPitch;
    videoPreview.currentTime = originalCurrentTime || 0;
    processor.disconnect();
    source.disconnect();
    silentGain.disconnect();
    stream.getTracks().forEach((track) => track.stop());
  }

  if (!sampleCount) {
    await audioContext.close();
    throw new Error("no-captured-audio");
  }

  const captured = new Float32Array(sampleCount);
  let offset = 0;
  for (const chunk of chunks) {
    captured.set(chunk, offset);
    offset += chunk.length;
  }

  const audioBuffer = audioContext.createBuffer(1, captured.length, audioContext.sampleRate);
  audioBuffer.copyToChannel(captured, 0);
  await audioContext.close();
  return audioBuffer;
}

function combineAudioBuffers(audioBuffers) {
  if (!audioBuffers.length) {
    throw new Error("no-audio-buffers");
  }

  const sampleRate = audioBuffers[0].sampleRate;
  const channelCount = Math.max(...audioBuffers.map((buffer) => buffer.numberOfChannels));
  const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const combined = new OfflineAudioContext(channelCount, totalLength, sampleRate).createBuffer(channelCount, totalLength, sampleRate);
  let writeOffset = 0;

  for (const buffer of audioBuffers) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const sourceChannel = buffer.getChannelData(Math.min(channelIndex, buffer.numberOfChannels - 1));
      combined.copyToChannel(sourceChannel, channelIndex, writeOffset);
    }
    writeOffset += buffer.length;
  }

  return combined;
}

async function analyzeDecodedAudioBuffer(audioBuffer, sourceName) {
  setAdStatus("Scanning the speech-frequency band for likely dialogue gaps...");
  const monoData = downmixAudio(audioBuffer);
  const voiceData = await filterVoiceBand(monoData, audioBuffer.sampleRate);
  const frames = measureFrames(monoData, voiceData, audioBuffer.sampleRate);
  lastAudioFrames = frames;
  lastAudioDuration = audioBuffer.duration;

  if (noDialogueToggle.checked) {
    rerunCurrentAudioSettings();
    return;
  }

  const analysis = findLowSpeechGaps(frames);
  lastAnalysis = analysis;
  const { gaps, threshold, musicBedDb } = analysis;

  updateGapSummary(gaps);
  renderGapRows(gaps);
  drawWaveform(frames, analysis);
  if (gaps.length) {
    setAdStatus("Analyzed " + formatTimestamp(audioBuffer.duration) + " from " + sourceName + ". Estimated music bed " + musicBedDb.toFixed(1) + " dB; speech cutoff " + threshold.toFixed(1) + " dB.");
  } else {
    setAdStatus("No openings found in " + sourceName + ". Estimated music bed " + musicBedDb.toFixed(1) + " dB; speech cutoff " + threshold.toFixed(1) + " dB.");
  }
}

async function analyzeAudioBuffer(arrayBuffer, sourceName) {
  resetGapSummary();
  renderGapRows([]);
  setAdStatus("Decoding audio from " + sourceName + "...");

  let audioBuffer;
  try {
    audioBuffer = await decodeAudioFromBuffer(arrayBuffer);
  } catch {
    clearVideoPreview();
    setAdStatus("This browser could not decode " + sourceName + ". Try an MP4, MOV, M4A, MP3, WAV, or a local file export. HLS video-only or MPEG-TS segments need conversion before analysis.");
    return;
  }

  await analyzeDecodedAudioBuffer(audioBuffer, sourceName);
}

function isLikelySmil(url, response, blob) {
  const contentType = response.headers.get("content-type") || "";
  return /\.smi?l(?:$|[?#])/i.test(url)
    || contentType.includes("smil")
    || contentType.includes("xml")
    || blob.type.includes("smil")
    || blob.type.includes("xml");
}

function isLikelyM3u8(url, response, blob) {
  const contentType = response.headers.get("content-type") || "";
  return /\.m3u8(?:$|[?#])/i.test(url)
    || contentType.includes("mpegurl")
    || contentType.includes("vnd.apple.mpegurl")
    || blob.type.includes("mpegurl");
}

function normalizeVideoAddress(value) {
  const trimmed = value.trim();
  const quaverVodId = trimmed.match(/^(?:smil:)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\.smil)?$/i);
  if (!quaverVodId) return trimmed;
  return "https://dashvideo.quavermusic.com/QuaverVOD/smil:" + quaverVodId[1] + ".smil/playlist.m3u8";
}

function getSmilMediaCandidates(smilText, smilUrl) {
  const documentXml = new DOMParser().parseFromString(smilText, "application/xml");
  if (documentXml.querySelector("parsererror")) return [];

  const mediaElements = documentXml.querySelectorAll("video[src], audio[src], ref[src], media[src]");
  return [...mediaElements]
    .map((element) => element.getAttribute("src"))
    .filter(Boolean)
    .map((src) => new URL(src, smilUrl).href);
}

function parseM3u8AttributeList(value) {
  const attributes = {};
  const pattern = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/gi;
  let match = pattern.exec(value);

  while (match) {
    attributes[match[1].toUpperCase()] = match[2].replace(/^"|"$/g, "");
    match = pattern.exec(value);
  }

  return attributes;
}

function parseM3u8Playlist(playlistText, playlistUrl) {
  const lines = playlistText
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const variants = [];
  const audioRenditions = [];
  const segments = [];
  let pendingVariant = null;

  for (const line of lines) {
    if (line.startsWith("#EXT-X-MEDIA")) {
      const attributes = parseM3u8AttributeList(line.slice(line.indexOf(":") + 1));
      if (attributes.TYPE === "AUDIO" && attributes.URI) {
        audioRenditions.push({
          default: attributes.DEFAULT === "YES",
          autoselect: attributes.AUTOSELECT === "YES",
          name: attributes.NAME || "",
          language: attributes.LANGUAGE || "",
          characteristics: attributes.CHARACTERISTICS || "",
          groupId: attributes["GROUP-ID"] || "",
          url: new URL(attributes.URI, playlistUrl).href,
        });
      }
      continue;
    }

    if (line.startsWith("#EXT-X-STREAM-INF")) {
      const attributes = parseM3u8AttributeList(line.slice(line.indexOf(":") + 1));
      pendingVariant = {
        bandwidth: Number(attributes.BANDWIDTH || 0),
        audioGroup: attributes.AUDIO || "",
      };
      continue;
    }

    if (line.startsWith("#EXT-X-MAP")) {
      const uri = line.match(/URI="([^"]+)"/)?.[1];
      if (uri) segments.push({ url: new URL(uri, playlistUrl).href, isMap: true });
      continue;
    }

    if (line.startsWith("#")) continue;

    const resolvedUrl = new URL(line, playlistUrl).href;
    if (pendingVariant) {
      variants.push({ ...pendingVariant, url: resolvedUrl });
      pendingVariant = null;
    } else {
      segments.push({ url: resolvedUrl, isMap: false });
    }
  }

  return { audioRenditions, variants, segments };
}

function chooseM3u8Variant(variants) {
  return [...variants].sort((a, b) => b.bandwidth - a.bandwidth)[0];
}

function isM3u8AudioDescription(rendition) {
  return /(^|[^a-z])ad([^a-z]|$)|audio description|descriptive audio|describes-video|description/i
    .test([rendition.name, rendition.language, rendition.characteristics].join(" "));
}

function chooseM3u8AudioRendition(audioRenditions, audioGroup = "") {
  const candidates = audioGroup
    ? audioRenditions.filter((rendition) => rendition.groupId === audioGroup)
    : audioRenditions;
  const nonAd = candidates.filter((rendition) => !isM3u8AudioDescription(rendition));
  return nonAd.find((rendition) => rendition.default)
    || nonAd.find((rendition) => rendition.autoselect)
    || nonAd[0]
    || candidates.find((rendition) => rendition.default)
    || candidates[0];
}

function buildPlayableHlsPlaylist(playlistText, playlistUrl) {
  const parsed = parseM3u8Playlist(playlistText, playlistUrl);
  const variant = chooseM3u8Variant(parsed.variants) || {};
  const selectedAudio = chooseM3u8AudioRendition(parsed.audioRenditions, variant.audioGroup);
  let pendingStreamInfo = false;
  const serializeMediaAttributes = (attributes) => Object.entries(attributes).map(([key, value]) => {
    const shouldQuote = ["GROUP-ID", "LANGUAGE", "NAME", "URI", "CHARACTERISTICS", "CHANNELS"].includes(key);
    return shouldQuote ? key + "=\"" + value + "\"" : key + "=" + value;
  }).join(",");

  return playlistText.replace(/\r/g, "").split("\n").map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#EXT-X-MEDIA")) {
      const prefix = line.slice(0, line.indexOf(":") + 1);
      const attributes = parseM3u8AttributeList(line.slice(line.indexOf(":") + 1));
      if (attributes.TYPE === "AUDIO" && attributes.URI) {
        const absoluteUri = new URL(attributes.URI, playlistUrl).href;
        const isSelected = selectedAudio && absoluteUri === selectedAudio.url;
        attributes.URI = absoluteUri;
        attributes.DEFAULT = isSelected ? "YES" : "NO";
        attributes.AUTOSELECT = isSelected ? "YES" : attributes.AUTOSELECT || "NO";
        return prefix + serializeMediaAttributes(attributes);
      }
    }

    if (trimmed.startsWith("#EXT-X-STREAM-INF")) {
      pendingStreamInfo = true;
      return line;
    }

    if (trimmed && !trimmed.startsWith("#") && pendingStreamInfo) {
      pendingStreamInfo = false;
      return new URL(trimmed, playlistUrl).href;
    }

    return line;
  }).join("\n");
}

async function getM3u8SegmentSources(playlistText, playlistUrl) {
  const parsed = parseM3u8Playlist(playlistText, playlistUrl);
  const variant = chooseM3u8Variant(parsed.variants) || {};
  const sources = [];
  const seen = new Set();

  const addSource = (source) => {
    if (!source?.url || seen.has(source.url)) return;
    seen.add(source.url);
    sources.push(source);
  };

  if (parsed.audioRenditions.length) {
    const groupRenditions = variant.audioGroup
      ? parsed.audioRenditions.filter((rendition) => rendition.groupId === variant.audioGroup)
      : parsed.audioRenditions;
    const nonAdRenditions = groupRenditions.filter((rendition) => !isM3u8AudioDescription(rendition));
    const selected = chooseM3u8AudioRendition(parsed.audioRenditions, variant.audioGroup);
    addSource({ label: selected?.name || "selected audio", url: selected?.url });
    nonAdRenditions
      .filter((rendition) => rendition.url !== selected?.url)
      .forEach((rendition) => addSource({ label: rendition.name || "alternate audio", url: rendition.url }));
    parsed.audioRenditions
      .filter((rendition) => !isM3u8AudioDescription(rendition) && rendition.url !== selected?.url)
      .forEach((rendition) => addSource({ label: rendition.name || "alternate audio", url: rendition.url }));
  }

  parsed.variants
    .sort((a, b) => b.bandwidth - a.bandwidth)
    .forEach((item) => addSource({ label: "variant playlist", url: item.url }));

  if (!sources.length && parsed.segments.length) {
    sources.push({ label: "media playlist", segments: parsed.segments.map((segment) => segment.url) });
  }

  return sources;
}

async function resolveM3u8Segments(playlistText, playlistUrl) {
  let parsed = parseM3u8Playlist(playlistText, playlistUrl);

  if (parsed.audioRenditions.length) {
    const variant = chooseM3u8Variant(parsed.variants) || {};
    const rendition = chooseM3u8AudioRendition(parsed.audioRenditions, variant.audioGroup);
    if (rendition) {
      setAdStatus("HLS audio playlist found: " + (rendition.name || "audio") + ". Fetching audio segments...");
      const audioResponse = await fetchMediaFromUrl(rendition.url);
      parsed = parseM3u8Playlist(await audioResponse.blob.text(), rendition.url);
    }
  } else if (parsed.variants.length) {
    const variant = chooseM3u8Variant(parsed.variants);
    setAdStatus("HLS master playlist found. Fetching variant playlist...");
    const variantResponse = await fetchMediaFromUrl(variant.url);
    parsed = parseM3u8Playlist(await variantResponse.blob.text(), variant.url);
  }

  return parsed.segments.map((segment) => segment.url);
}

async function fetchM3u8AsBlob(playlistText, playlistUrl) {
  const segmentUrls = await resolveM3u8Segments(playlistText, playlistUrl);
  if (!segmentUrls.length) {
    throw new Error("no-segments");
  }

  const parts = [];
  for (let index = 0; index < segmentUrls.length; index += 1) {
    setAdStatus("Fetching HLS segment " + (index + 1) + " of " + segmentUrls.length + "...");
    const segment = await fetchMediaFromUrl(segmentUrls[index]);
    parts.push(await segment.blob.arrayBuffer());
  }

  const firstSegment = segmentUrls[0].split("?")[0].toLowerCase();
  const type = firstSegment.endsWith(".aac")
    ? "audio/aac"
    : firstSegment.endsWith(".m4s") || firstSegment.endsWith(".mp4")
      ? "video/mp4"
      : "video/mp2t";
  return new Blob(parts, { type });
}

async function decodeM3u8SegmentUrls(segmentUrls, sourceLabel) {
  if (!segmentUrls.length) {
    throw new Error("no-segments");
  }

  const audioBuffers = [];
  const segmentParts = [];
  let skippedSegments = 0;
  for (let index = 0; index < segmentUrls.length; index += 1) {
    setAdStatus("Decoding " + sourceLabel + " segment " + (index + 1) + " of " + segmentUrls.length + "...");
    const segment = await fetchMediaFromUrl(segmentUrls[index]);
    const segmentBuffer = await segment.blob.arrayBuffer();
    segmentParts.push(segmentBuffer);
    try {
      audioBuffers.push(await decodeAudioFromBuffer(segmentBuffer));
    } catch {
      const extractedAudio = extractAudioFromTsSegment(segmentBuffer);
      if (extractedAudio) {
        try {
          audioBuffers.push(await decodeAudioFromBuffer(extractedAudio));
        } catch {
          skippedSegments += 1;
        }
      } else {
        skippedSegments += 1;
      }
    }
  }

  if (audioBuffers.length) {
    if (skippedSegments) {
      setAdStatus("Decoded " + audioBuffers.length + " " + sourceLabel + " segments; skipped " + skippedSegments + " segment" + (skippedSegments === 1 ? "" : "s") + " this browser could not decode.");
    }
    return combineAudioBuffers(audioBuffers);
  }

  try {
    setAdStatus("Trying stitched " + sourceLabel + " decode...");
    const firstSegment = segmentUrls[0].split("?")[0].toLowerCase();
    const type = firstSegment.endsWith(".aac") ? "audio/aac" : "video/mp2t";
    const stitchedBlob = new Blob(segmentParts, { type });
    return await decodeAudioFromBuffer(await stitchedBlob.arrayBuffer());
  } catch {
    throw new Error("segment-decode-failed");
  }
}

async function fetchM3u8AsAudioBuffer(playlistText, playlistUrl) {
  const sources = await getM3u8SegmentSources(playlistText, playlistUrl);
  if (!sources.length) {
    throw new Error("no-segments");
  }

  const failures = [];
  for (const source of sources) {
    try {
      let segmentUrls = source.segments;
      if (!segmentUrls) {
        setAdStatus("Trying HLS audio source: " + source.label + "...");
        const playlistResponse = await fetchMediaFromUrl(source.url);
        const parsed = parseM3u8Playlist(await playlistResponse.blob.text(), source.url);
        segmentUrls = parsed.segments.map((segment) => segment.url);
      }
      return await decodeM3u8SegmentUrls(segmentUrls, source.label);
    } catch (error) {
      failures.push(source.label + " (" + error.message + ")");
    }
  }

  throw new Error("segment-decode-failed:" + failures.join(", "));
}

async function fetchMediaFromUrl(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("fetch-failed");
  }

  if (!response.ok) {
    throw new Error("http-" + response.status);
  }

  return {
    blob: await response.blob(),
    response,
  };
}

async function analyzeVideoUrl() {
  const url = normalizeVideoAddress(videoUrlInput.value);
  if (!url) {
    setAdStatus("Enter a video address or load a local video file.");
    return;
  }
  videoUrlInput.value = url;

  resetGapSummary();
  renderGapRows([]);
  setAdStatus("Fetching the address...");
  let fetched;
  try {
    fetched = await fetchMediaFromUrl(url);
  } catch (error) {
    clearVideoPreview();
    if (error.message.startsWith("http-")) {
      setAdStatus("The address returned HTTP " + error.message.replace("http-", "") + ".");
      return;
    }
    setAdStatus("The video address could not be fetched. If the site blocks browser access, download the file and load it locally.");
    return;
  }

  let blob = fetched.blob;
  let sourceName = "the video address";

  if (isLikelySmil(url, fetched.response, blob)) {
    setAdStatus("Reading SMIL and looking for the referenced media...");
    const candidates = getSmilMediaCandidates(await blob.text(), url);
    if (!candidates.length) {
      clearVideoPreview();
      setAdStatus("The SMIL file did not include a supported video, audio, ref, or media src.");
      return;
    }

    const mediaUrl = candidates[0];
    setAdStatus("SMIL points to " + mediaUrl + ". Fetching referenced media...");
    try {
      const media = await fetchMediaFromUrl(mediaUrl);
      blob = media.blob;
      sourceName = "the media referenced by the SMIL";
      videoPreview.src = mediaUrl;
    } catch {
      clearVideoPreview();
      setAdStatus("The SMIL was readable, but the referenced media could not be fetched by the browser.");
      return;
    }
  } else if (isLikelyM3u8(url, fetched.response, blob)) {
    setAdStatus("Reading HLS playlist and decoding audio segments...");
    try {
      const playlistText = await blob.text();
      const playablePlaylist = buildPlayableHlsPlaylist(playlistText, url);
      videoPreview.src = URL.createObjectURL(new Blob([playablePlaylist], { type: "application/vnd.apple.mpegurl" }));
      const audioBuffer = await fetchM3u8AsAudioBuffer(playlistText, url);
      await analyzeDecodedAudioBuffer(audioBuffer, "the HLS audio rendition");
      return;
    } catch (error) {
      if (error.message === "no-segments") {
        setAdStatus("The HLS playlist did not list media segments this browser can follow.");
      } else if (error.message.startsWith("segment-decode-failed")) {
        try {
          const capturedAudio = await capturePlayableMediaAudio("the playable HLS video");
          await analyzeDecodedAudioBuffer(capturedAudio, "the playable HLS video");
          return;
        } catch {
          setAdStatus("The HLS playlist was readable and the video may play, but this browser could not extract audio for analysis.");
        }
      } else {
        setAdStatus("The HLS playlist was readable, but its audio segments could not be fetched by the browser.");
        clearVideoPreview();
      }
      return;
    }
  } else {
    videoPreview.src = URL.createObjectURL(blob);
  }

  await analyzeAudioBuffer(await blob.arrayBuffer(), sourceName);
}

async function analyzeVideoFile(file) {
  if (!file) {
    setAdStatus("Choose a video or audio file to analyze.");
    return;
  }

  videoPreview.src = URL.createObjectURL(file);
  await analyzeAudioBuffer(await file.arrayBuffer(), file.name);
}

async function canvasToImage(canvas) {
  const image = new Image();
  image.decoding = "async";
  image.src = canvas.toDataURL("image/png");
  await image.decode();
  return image;
}

async function loadImageFile(file) {
  activePdf = null;
  pdfControls.classList.add("hidden");
  const url = URL.createObjectURL(file);
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = url;
  }).catch(() => {
    setStatus("That image could not be loaded.");
  });
  if (!image.complete || !image.naturalWidth) {
    URL.revokeObjectURL(url);
    return;
  }
  sourceImage = image;
  drawSourceToOriginalCanvas(image);
  showCanvas();
  setStatus("Loaded image: " + file.name);
  URL.revokeObjectURL(url);
}

async function loadClipboardImage(item) {
  const file = item.getAsFile();
  if (!file) return;
  await loadImageFile(file);
  setStatus("Pasted screenshot from clipboard.");
}

async function renderPdfPage(pageNumber) {
  const page = await activePdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: activePdfScale });
  const renderCanvas = document.createElement("canvas");
  const renderCtx = renderCanvas.getContext("2d");
  renderCanvas.width = Math.floor(viewport.width);
  renderCanvas.height = Math.floor(viewport.height);
  await page.render({ canvasContext: renderCtx, viewport }).promise;
  sourceImage = await canvasToImage(renderCanvas);
  drawSourceToOriginalCanvas(sourceImage);
  showCanvas();
  setStatus("Rendered PDF page " + pageNumber + " of " + activePdf.numPages + ".");
}

async function loadPdfFile(file) {
  try {
    pdfjsLib ||= await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  } catch {
    setStatus("PDF support could not load. Image paste and image files still work.");
    return;
  }

  const buffer = await file.arrayBuffer();
  try {
    activePdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  } catch {
    setStatus("That PDF could not be rendered.");
    return;
  }

  pageSelect.innerHTML = "";
  for (let page = 1; page <= activePdf.numPages; page += 1) {
    const option = document.createElement("option");
    option.value = String(page);
    option.textContent = "Page " + page;
    pageSelect.append(option);
  }
  pdfControls.classList.remove("hidden");
  await renderPdfPage(1);
}

async function handleFile(file) {
  if (!file) return;
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    await loadPdfFile(file);
    return;
  }
  if (file.type.startsWith("image/")) {
    await loadImageFile(file);
    return;
  }
  setStatus("Use an image file or PDF.");
}

async function readClipboard() {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (imageType) {
        const blob = await item.getType(imageType);
        await loadImageFile(new File([blob], "clipboard-image.png", { type: imageType }));
        setStatus("Read image from clipboard.");
        return;
      }
    }
    setStatus("No image was found on the clipboard.");
  } catch {
    setStatus("Clipboard permission was blocked. Ctrl+V still works after clicking the page.");
  }
}

fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
pasteButton.addEventListener("click", readClipboard);

document.addEventListener("paste", async (event) => {
  for (const item of event.clipboardData.items) {
    if (item.type.startsWith("image/")) {
      event.preventDefault();
      await loadClipboardImage(item);
      return;
    }
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  await handleFile(event.dataTransfer.files[0]);
});

effectSelect.addEventListener("change", applyEffect);
zoomRange.addEventListener("input", refreshZoom);
compareToggle.addEventListener("change", syncCompareView);

pageSelect.addEventListener("change", async () => {
  await renderPdfPage(Number(pageSelect.value));
});

downloadButton.addEventListener("click", () => {
  const link = document.createElement("a");
  const effectName = effectSelect.value;
  link.download = "a11y-" + effectName + ".png";
  link.href = effectCanvas.toDataURL("image/png");
  link.click();
});

visualModeButton.addEventListener("click", () => setMode("visual"));
adModeButton.addEventListener("click", () => setMode("ad"));
analyzeAudioButton.addEventListener("click", analyzeVideoUrl);
videoFileInput.addEventListener("change", () => analyzeVideoFile(videoFileInput.files[0]));
scriptFileInput.addEventListener("change", async () => {
  const file = scriptFileInput.files[0];
  if (!file) return;
  loadedScriptFileName = file.name || "audio-description-script.txt";
  scriptInput.value = await file.text();
  updateScriptStats();
  resetTtsTimelineToCurrentPosition();
  rerunCurrentAudioSettings();
});
scriptInput.addEventListener("input", () => {
  updateScriptStats();
  resetTtsTimelineToCurrentPosition();
  rerunCurrentAudioSettings();
});
videoPreview.addEventListener("timeupdate", updatePlaybackIndicators);
videoPreview.addEventListener("seeking", () => {
  resetUpcomingTts();
  updatePlaybackIndicators();
});
videoPreview.addEventListener("play", () => {
  if (isResumingAfterExtendedAd) {
    isResumingAfterExtendedAd = false;
  } else {
    resetUpcomingTts();
  }
  updatePlaybackIndicators();
});
videoPreview.addEventListener("pause", () => {
  if (!isExtendedAdPause && "speechSynthesis" in window) window.speechSynthesis.cancel();
});
videoPreview.addEventListener("loadedmetadata", updatePlaybackIndicators);
waveformCanvas.addEventListener("mousemove", handleWaveformPointerMove);
waveformCanvas.addEventListener("mouseleave", () => {
  waveformTooltip.classList.add("hidden");
  waveformCanvas.style.cursor = "default";
});
waveformCanvas.addEventListener("click", seekWaveformGap);
waveformZoomInput.addEventListener("input", () => {
  if (lastAudioFrames.length) {
    drawWaveform(lastAudioFrames, lastAnalysis);
  } else {
    drawWaveform([], null);
  }
});
function nudgeWaveformZoom(amount) {
  const nextValue = Math.max(
    Number(waveformZoomInput.min),
    Math.min(Number(waveformZoomInput.max), Number(waveformZoomInput.value) + amount),
  );
  waveformZoomInput.value = String(nextValue);
  waveformZoomInput.dispatchEvent(new Event("input", { bubbles: true }));
}
waveformZoomOutButton.addEventListener("click", () => nudgeWaveformZoom(-0.5));
waveformZoomInButton.addEventListener("click", () => nudgeWaveformZoom(0.5));
ttsRateInput.addEventListener("input", refreshTtsRate);
ttsVoiceSelect.addEventListener("change", () => {
  isExtendedAdPause = false;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
});
saveScriptButton.addEventListener("click", saveScript);
ttsSyncToggle.addEventListener("change", () => {
  resetTtsTimelineToCurrentPosition();
  isExtendedAdPause = false;
  if (!ttsSyncToggle.checked && "speechSynthesis" in window) window.speechSynthesis.cancel();
});
extendedAdToggle.addEventListener("change", () => {
  resetTtsTimelineToCurrentPosition();
  isExtendedAdPause = false;
  if (!extendedAdToggle.checked && "speechSynthesis" in window) window.speechSynthesis.cancel();
});
stopTtsButton.addEventListener("click", () => {
  isExtendedAdPause = false;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  spokenScriptItemIds.clear();
});

for (const input of [speechRateInput, silenceThresholdInput, speechLiftInput, minGapInput, paddingInput, noDialogueToggle]) {
  input.addEventListener("input", rerunCurrentAudioSettings);
  input.addEventListener("change", rerunCurrentAudioSettings);
}

window.addEventListener("resize", () => {
  if (lastAudioFrames.length) {
    rerunCurrentAudioSettings();
  } else {
    drawWaveform([], null);
  }
});

syncCompareView();
refreshZoom();
setMode("visual");
updateScriptStats();
refreshTtsRate();
populateTtsVoices();
if ("speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", populateTtsVoices);
}
refreshWaveformZoom();
drawWaveform([], null);
