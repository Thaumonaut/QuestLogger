const LS_KEY = "ql_pomodoro_sound";

export const POMODORO_SOUND_DEFAULTS = {
  volume: 0.65,
  preset: "chime",
  pitch: 1,
};

export function loadPomodoroSoundSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...POMODORO_SOUND_DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      ...POMODORO_SOUND_DEFAULTS,
      volume: typeof parsed.volume === "number" ? clamp(parsed.volume, 0, 1) : POMODORO_SOUND_DEFAULTS.volume,
      preset: typeof parsed.preset === "string" ? parsed.preset : POMODORO_SOUND_DEFAULTS.preset,
      pitch: typeof parsed.pitch === "number" ? clamp(parsed.pitch, 0.5, 1.5) : POMODORO_SOUND_DEFAULTS.pitch,
    };
  } catch {
    return { ...POMODORO_SOUND_DEFAULTS };
  }
}

export function savePomodoroSoundSettings(settings) {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      volume: clamp(settings.volume, 0, 1),
      preset: settings.preset,
      pitch: clamp(settings.pitch, 0.5, 1.5),
    })
  );
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

let audioCtxRef = null;

function getAudioContext() {
  if (!audioCtxRef) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtxRef = new AC();
  }
  return audioCtxRef;
}

/** @param {typeof POMODORO_SOUND_DEFAULTS} settings */
export async function playCompletionSound(settings) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    return;
  }

  const vol = clamp(settings.volume, 0, 1) * 0.95;
  const p = clamp(settings.pitch, 0.5, 1.5);

  const notes =
    settings.preset === "beep"
      ? [[0, 880 * p, 0.12]]
      : settings.preset === "ding"
        ? [[0, 523 * p, 0.35]]
        : settings.preset === "bell"
          ? [
              [0, 1046 * p, 0.2],
              [0.25, 1318 * p, 0.25],
            ]
          : [
              [0, 880 * p, 0.22],
              [0.3, 880 * p, 0.22],
              [0.6, 1174 * p, 0.22],
            ];

  const now = ctx.currentTime;
  notes.forEach(([t, freq, dur]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = settings.preset === "ding" ? "sine" : "triangle";
    const start = now + t;
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  });
}
