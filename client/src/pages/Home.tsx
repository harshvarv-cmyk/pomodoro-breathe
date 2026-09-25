import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CloudRain,
  Info,
  Leaf,
  Music2,
  Minus,
  Plus,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type TimerMode = "focus" | "shortBreak" | "longBreak";
type Soundscape = "off" | "rain" | "forest" | "study";

type BreakInterval = {
  id: number;
  minutes: number;
};

type ModeConfig = {
  label: string;
  eyebrow: string;
  duration: number;
  note: string;
};

const MODES: Record<TimerMode, ModeConfig> = {
  focus: {
    label: "Focus",
    eyebrow: "Deep work",
    duration: 25 * 60,
    note: "One thing at a time.",
  },
  shortBreak: {
    label: "Short break",
    eyebrow: "Reset gently",
    duration: 5 * 60,
    note: "Let your mind wander.",
  },
  longBreak: {
    label: "Long break",
    eyebrow: "Restore",
    duration: 15 * 60,
    note: "A little more space to breathe.",
  },
};

const SCENES: Record<TimerMode, Record<string, string>> = {
  focus: {
    scene1: "#070b25",
    scene2: "#171348",
    scene3: "#302066",
    scene4: "#0a112e",
    accent: "#b8a3ff",
    accentSoft: "#79c9ff",
    ambient: "rgba(138, 105, 255, 0.31)",
    text: "#f8f6ff",
  },
  shortBreak: {
    scene1: "#26172b",
    scene2: "#573657",
    scene3: "#4c7c91",
    scene4: "#243c59",
    accent: "#ffc2c8",
    accentSoft: "#a6e9dc",
    ambient: "rgba(255, 167, 202, 0.32)",
    text: "#fff8fb",
  },
  longBreak: {
    scene1: "#122b31",
    scene2: "#275b63",
    scene3: "#537c8c",
    scene4: "#1c384d",
    accent: "#a6f0dc",
    accentSoft: "#b9d8ff",
    ambient: "rgba(126, 227, 207, 0.28)",
    text: "#f3fffc",
  },
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

const SESSIONS_BEFORE_LONG_BREAK = 4;
const STORAGE_KEY = "breathe-pomodoro:v1";

type StoredState = {
  breakIntervals: BreakInterval[];
  soundscape: Soundscape;
  soundEnabled: boolean;
  completedSessions: number;
};

function loadStoredState(): Partial<StoredState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<StoredState>) : {};
  } catch {
    return {};
  }
}

// Predicts what comes after the *current* mode, given how many focus
// sessions have completed so far. Every 4th completed focus session
// earns a long break instead of a short one.
function getNextMode(mode: TimerMode, completedSessions: number): TimerMode {
  if (mode !== "focus") return "focus";
  const wouldBeLongBreak = (completedSessions + 1) % SESSIONS_BEFORE_LONG_BREAK === 0;
  return wouldBeLongBreak ? "longBreak" : "shortBreak";
}

export default function Home() {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(MODES.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(
    () => loadStoredState().completedSessions ?? 0,
  );
  const [soundEnabled, setSoundEnabled] = useState(() => loadStoredState().soundEnabled ?? true);
  const [isCompletePulse, setIsCompletePulse] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [soundscapeOpen, setSoundscapeOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [activeBreakIndex, setActiveBreakIndex] = useState(0);
  const [breakIntervals, setBreakIntervals] = useState<BreakInterval[]>(
    () =>
      loadStoredState().breakIntervals ?? [
        { id: 1, minutes: 5 },
        { id: 2, minutes: 5 },
        { id: 3, minutes: 15 },
      ],
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientCleanupRef = useRef<(() => void) | null>(null);
  const [soundscape, setSoundscape] = useState<Soundscape>(
    () => loadStoredState().soundscape ?? "off",
  );
  const sessionsInCycle = completedSessions % SESSIONS_BEFORE_LONG_BREAK;

  const config = MODES[mode];
  const currentBreakMinutes = breakIntervals[activeBreakIndex]?.minutes ?? 5;
  const currentDuration = mode === "shortBreak" ? currentBreakMinutes * 60 : config.duration;
  const scene = SCENES[mode];
  const progress = (currentDuration - secondsLeft) / currentDuration;
  const progressPercent = Math.round(progress * 100);

  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setIsRunning(false);
          setIsCompletePulse(true);
          window.setTimeout(() => setIsCompletePulse(false), 1800);

          const nextMode = getNextMode(mode, completedSessions);
          if (mode === "focus") {
            setCompletedSessions((sessions) => sessions + 1);
          }
          setMode(nextMode);

          if (nextMode === "shortBreak") {
            return (breakIntervals[activeBreakIndex]?.minutes ?? 5) * 60;
          }
          if (nextMode === "longBreak") {
            return MODES.longBreak.duration;
          }
          // Coming back to focus after a break: line up the next planned break.
          setActiveBreakIndex((index) => (index + 1) % breakIntervals.length);
          return MODES.focus.duration;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeBreakIndex, breakIntervals, completedSessions, isRunning, mode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ breakIntervals, soundscape, soundEnabled, completedSessions }),
      );
    } catch {
      // Ignore storage errors (e.g. private browsing / storage disabled).
    }
  }, [breakIntervals, soundscape, soundEnabled, completedSessions]);

  useEffect(() => {
    if (!isRunning || !soundEnabled) return;

    const tick = window.setInterval(() => {
      playTick();
    }, 1000);

    return () => window.clearInterval(tick);
  }, [isRunning, soundEnabled]);

  useEffect(() => {
    if (isRunning && soundEnabled && soundscape !== "off") {
      startSoundscape(soundscape);
    } else {
      stopSoundscape();
    }

    return () => stopSoundscape();
  }, [isRunning, soundEnabled, soundscape]);

  useEffect(() => {
    document.title = `${formatTime(secondsLeft)} · ${config.label} · Breathe`;
  }, [config.label, secondsLeft]);

  const sceneStyle = useMemo(
    () =>
      ({
        "--scene-1": scene.scene1,
        "--scene-2": scene.scene2,
        "--scene-3": scene.scene3,
        "--scene-4": scene.scene4,
        "--accent": scene.accent,
        "--accent-soft": scene.accentSoft,
        "--ambient": scene.ambient,
        "--scene-text": scene.text,
        "--progress": `${progress * 360}deg`,
      }) as React.CSSProperties,
    [progress, scene],
  );

  function chooseMode(nextMode: TimerMode) {
    setIsRunning(false);
    setMode(nextMode);
    setSecondsLeft(nextMode === "shortBreak" ? currentBreakMinutes * 60 : MODES[nextMode].duration);
    setIsCompletePulse(false);
  }

  function resetTimer() {
    setIsRunning(false);
    setSecondsLeft(currentDuration);
    setIsCompletePulse(false);
  }

  function prepareAudio() {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }
  }

  function playTick() {
    if (!soundEnabled || !audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(920, now);
    oscillator.frequency.exponentialRampToValueAtTime(650, now + 0.045);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.018, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.08);
  }

  function stopSoundscape() {
    ambientCleanupRef.current?.();
    ambientCleanupRef.current = null;
  }

  function startSoundscape(nextSoundscape: Exclude<Soundscape, "off">) {
    if (!audioContextRef.current) prepareAudio();
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    stopSoundscape();

    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseData.length; index += 1) {
      noiseData[index] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noise.connect(filter);
    filter.connect(master);

    const activeNodes: AudioScheduledSourceNode[] = [noise];
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.014, now + 2.8);

    if (nextSoundscape === "rain") {
      filter.type = "bandpass";
      filter.frequency.value = 1450;
      filter.Q.value = 0.45;
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.022, now + 2.8);
    }

    if (nextSoundscape === "forest") {
      filter.type = "lowpass";
      filter.frequency.value = 850;
      filter.Q.value = 0.35;
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.012, now + 3.2);
    }

    if (nextSoundscape === "study") {
      filter.type = "lowpass";
      filter.frequency.value = 360;
      filter.Q.value = 0.25;

      const hum = audioContext.createOscillator();
      const humGain = audioContext.createGain();
      hum.type = "sine";
      hum.frequency.value = 174;
      humGain.gain.value = 0.018;
      hum.connect(humGain);
      humGain.connect(master);
      hum.start(now);
      activeNodes.push(hum);
    }

    master.connect(audioContext.destination);
    noise.start(now);

    ambientCleanupRef.current = () => {
      const stopAt = audioContext.currentTime;
      master.gain.cancelScheduledValues(stopAt);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), stopAt);
      master.gain.exponentialRampToValueAtTime(0.0001, stopAt + 0.8);
      window.setTimeout(() => {
        activeNodes.forEach((node) => {
          try {
            node.stop();
          } catch {
            // Nodes may already be stopped during rapid soundscape changes.
          }
        });
        master.disconnect();
      }, 900);
    };
  }

  function toggleRunning() {
    if (!isRunning) prepareAudio();
    setIsRunning((running) => !running);
  }

  function updateBreakCount(nextCount: number) {
    const safeCount = Math.max(1, Math.min(8, nextCount));
    setBreakIntervals((current) =>
      Array.from({ length: safeCount }, (_, index) => current[index] ?? { id: index + 1, minutes: 5 }),
    );
    setActiveBreakIndex((index) => Math.min(index, safeCount - 1));
  }

  function updateBreakMinutes(index: number, value: string) {
    const minutes = Math.max(1, Math.min(60, Number(value) || 1));
    setBreakIntervals((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, minutes } : item)));
    if (mode === "shortBreak" && index === activeBreakIndex && !isRunning) {
      setSecondsLeft(minutes * 60);
    }
  }

  return (
    <div
      className={`scene min-h-screen overflow-hidden text-white ${isRunning ? "scene-running" : "scene-paused"} ${isCompletePulse ? "scene-complete" : ""}`}
      style={sceneStyle}
    >
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <div className="wave-scene" aria-hidden="true">
        <svg className="wave-layer wave-layer-3" viewBox="0 0 2400 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave-gradient-3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: "var(--scene-3)", stopOpacity: 0.85 }} />
              <stop offset="100%" style={{ stopColor: "var(--accent-soft)", stopOpacity: 0.85 }} />
            </linearGradient>
          </defs>
          <path
            fill="url(#wave-gradient-3)"
            d="M0,160 c100,-70 100,70 200,0 c100,-70 100,70 200,0 c100,-70 100,70 200,0 c100,-70 100,70 200,0 c100,-70 100,70 200,0 c100,-70 100,70 200,0 c100,-70 100,70 200,0 c100,-70 100,70 200,0 c100,-70 100,70 200,0 c100,-70 100,70 200,0 c100,-70 100,70 200,0 c100,-70 100,70 200,0 L2400,300 L0,300 Z"
          />
        </svg>
        <svg className="wave-layer wave-layer-2" viewBox="0 0 2400 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.75 }} />
              <stop offset="100%" style={{ stopColor: "var(--scene-3)", stopOpacity: 0.75 }} />
            </linearGradient>
          </defs>
          <path
            fill="url(#wave-gradient-2)"
            d="M0,170 c150,-55 150,55 300,0 c150,-55 150,55 300,0 c150,-55 150,55 300,0 c150,-55 150,55 300,0 c150,-55 150,55 300,0 c150,-55 150,55 300,0 c150,-55 150,55 300,0 c150,-55 150,55 300,0 L2400,300 L0,300 Z"
          />
        </svg>
        <svg className="wave-layer wave-layer-1" viewBox="0 0 2400 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: "var(--accent-soft)", stopOpacity: 0.7 }} />
              <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0.7 }} />
            </linearGradient>
          </defs>
          <path
            fill="url(#wave-gradient-1)"
            d="M0,190 c200,-40 200,40 400,0 c200,-40 200,40 400,0 c200,-40 200,40 400,0 c200,-40 200,40 400,0 c200,-40 200,40 400,0 c200,-40 200,40 400,0 L2400,300 L0,300 Z"
          />
        </svg>
      </div>

      <div className="grain" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-12">
        <header className="relative flex items-center justify-between" aria-label="Pomodoro Breathe header">
          <div className="flex items-center gap-3">
            <div className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div>
              <p className="font-display text-[15px] font-semibold tracking-[-0.02em] text-white/95">
                breathe
              </p>
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.24em] text-white/45">
                pomodoro ritual
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/55 backdrop-blur-md sm:flex">
              <span className={`status-dot ${isRunning ? "status-dot-live" : ""}`} />
              {isRunning ? "Breathing" : "Resting"}
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label={soundEnabled ? "Mute timer sounds" : "Enable timer sounds"}
              onClick={() => setSoundEnabled((enabled) => !enabled)}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <button
              type="button"
              className={`icon-button ${soundscapeOpen ? "icon-button-active" : ""}`}
              aria-label="Choose ambient soundscape"
              aria-expanded={soundscapeOpen}
              onClick={() => {
                setSoundscapeOpen((open) => !open);
                setPlanOpen(false);
                setInfoOpen(false);
              }}
            >
              <Music2 size={15} />
            </button>
            <button
              type="button"
              className={`icon-button ${infoOpen ? "icon-button-active" : ""}`}
              aria-label="How Breathe works"
              aria-expanded={infoOpen}
              onClick={() => {
                setInfoOpen((open) => !open);
                setPlanOpen(false);
                setSoundscapeOpen(false);
              }}
            >
              {infoOpen ? <X size={15} /> : <Info size={15} />}
            </button>
            <button
              type="button"
              className={`icon-button ${planOpen ? "icon-button-active" : ""}`}
              aria-label="Open today’s plan"
              aria-expanded={planOpen}
              onClick={() => {
                setPlanOpen((open) => !open);
                setSoundscapeOpen(false);
                setInfoOpen(false);
              }}
            >
              {planOpen ? <X size={15} /> : <Settings2 size={15} />}
            </button>
          </div>

          <AnimatePresence>
            {infoOpen && (
              <motion.aside
                className="info-menu"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.985 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                aria-label="How Breathe works"
              >
                <div className="info-menu-heading">
                  <div>
                    <p className="plan-kicker">A gentle rhythm</p>
                    <h2>How breathe works</h2>
                  </div>
                  <Sparkles size={16} className="soundscape-leaf" />
                </div>
                <div className="info-list">
                  <div className="info-row">
                    <span className="info-number">01</span>
                    <div>
                      <strong>Start a focus interval</strong>
                      <p>Stay with one thing until the ring completes.</p>
                    </div>
                  </div>
                  <div className="info-row">
                    <span className="info-number">02</span>
                    <div>
                      <strong>Take the next pause</strong>
                      <p>Your Today&apos;s plan controls how many breaks come between sessions.</p>
                    </div>
                  </div>
                  <div className="info-row">
                    <span className="info-number">03</span>
                    <div>
                      <strong>Shape the atmosphere</strong>
                      <p>Use the note icon for quiet ambience and the speaker for ticking.</p>
                    </div>
                  </div>
                </div>
                <p className="info-footer">Everything fades gently when you pause.</p>
              </motion.aside>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {soundscapeOpen && (
              <motion.aside
                className="soundscape-menu"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.985 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                aria-label="Ambient soundscape settings"
              >
                <div className="soundscape-heading">
                  <div>
                    <p className="plan-kicker">Ambient layer</p>
                    <h2>Settle into the room.</h2>
                  </div>
                  <Leaf size={16} className="soundscape-leaf" />
                </div>
                <div className="soundscape-options">
                  {([
                    ["off", "Silent", "Timer tick only"],
                    ["rain", "Night rain", "Soft and steady"],
                    ["forest", "Forest air", "Leaves in the distance"],
                    ["study", "Study hum", "Warm and focused"],
                  ] as [Soundscape, string, string][]).map(([value, label, description]) => (
                    <button
                      type="button"
                      key={value}
                      className={`soundscape-option ${soundscape === value ? "soundscape-option-active" : ""}`}
                      onClick={() => {
                        setSoundscape(value);
                        setSoundscapeOpen(false);
                      }}
                    >
                      <span className="soundscape-option-copy">
                        <span>{label}</span>
                        <small>{description}</small>
                      </span>
                      <span className="soundscape-radio" aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <p className="plan-footnote">Ambient sound plays while the timer is running.</p>
              </motion.aside>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {planOpen && (
              <motion.aside
                className="plan-menu"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.985 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                aria-label="Today’s plan settings"
              >
                <div className="plan-menu-heading">
                  <div>
                    <p className="plan-kicker">Today&apos;s plan</p>
                    <h2>Make space to breathe.</h2>
                  </div>
                  <span className="plan-count-badge">{breakIntervals.length} breaks</span>
                </div>

                <div className="plan-menu-summary">
                  <span>25 min focus</span>
                  <span className="summary-line" />
                  <span>{breakIntervals.reduce((total, item) => total + item.minutes, 0)} min recovery</span>
                </div>

                <div className="break-count-row">
                  <div>
                    <p className="plan-label">Break intervals</p>
                    <p className="plan-helper">How many pauses in today&apos;s rhythm?</p>
                  </div>
                  <div className="stepper" aria-label="Number of break intervals">
                    <button type="button" onClick={() => updateBreakCount(breakIntervals.length - 1)} aria-label="Fewer breaks">
                      <Minus size={13} />
                    </button>
                    <span>{breakIntervals.length}</span>
                    <button type="button" onClick={() => updateBreakCount(breakIntervals.length + 1)} aria-label="More breaks">
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <div className="break-list">
                  {breakIntervals.map((item, index) => (
                    <div key={item.id} className={`break-row ${index === activeBreakIndex ? "break-row-active" : ""}`}>
                      <button
                        type="button"
                        className="break-row-label"
                        onClick={() => {
                          setActiveBreakIndex(index);
                          setIsRunning(false);
                          setMode("shortBreak");
                          setSecondsLeft(item.minutes * 60);
                          setIsCompletePulse(false);
                        }}
                      >
                        <span className="break-index">{String(index + 1).padStart(2, "0")}</span>
                        <span>{index === breakIntervals.length - 1 ? "Long reset" : "Soft reset"}</span>
                      </button>
                      <label className="duration-input">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={item.minutes}
                          aria-label={`Break ${index + 1} duration in minutes`}
                          onChange={(event) => updateBreakMinutes(index, event.target.value)}
                        />
                        <span>min</span>
                      </label>
                    </div>
                  ))}
                </div>

                <p className="plan-footnote">Tap an interval to make it the next break.</p>
              </motion.aside>
            )}
          </AnimatePresence>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-10 sm:py-14">
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2 sm:mb-10">
            {(Object.keys(MODES) as TimerMode[]).map((item) => {
              const isActive = item === mode;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => chooseMode(item)}
                  className={`mode-tab ${isActive ? "mode-tab-active" : ""}`}
                  aria-pressed={isActive}
                >
                  <span>{MODES[item].label}</span>
                  <span className="mode-tab-time">
                    {Math.round(MODES[item].duration / 60)}m
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className="timer-card w-full max-w-[640px]"
          >
            <div className="timer-card-topline">
              <div className="flex items-center gap-2">
                <Sparkles size={13} strokeWidth={1.7} className="text-[var(--accent)]" />
                <span>{config.eyebrow}</span>
              </div>
              <span className="tracking-[0.14em] text-white/35">{String(sessionsInCycle + 1).padStart(2, "0")} / 04</span>
            </div>

            <div className="timer-stage">
              <div className={`timer-aura ${isRunning ? "timer-aura-active" : ""}`} aria-hidden="true" />
              <div className="timer-ring-wrapper">
                <svg className="timer-ring" viewBox="0 0 320 320" role="img" aria-label={`${progressPercent}% complete`}>
                  <defs>
                    <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent)" />
                      <stop offset="100%" stopColor="var(--accent-soft)" />
                    </linearGradient>
                  </defs>
                  <circle className="ring-track" cx="160" cy="160" r="137" />
                  <circle
                    className="ring-progress"
                    cx="160"
                    cy="160"
                    r="137"
                    stroke="url(#ring-gradient)"
                    strokeDasharray={2 * Math.PI * 137}
                    strokeDashoffset={2 * Math.PI * 137 * (1 - progress)}
                  />
                </svg>
                <div className="timer-readout">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={mode}
                      initial={{ opacity: 0, y: 7 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -7 }}
                      transition={{ duration: 0.24 }}
                      className="flex flex-col items-center"
                    >
                      <span className="timer-label">{config.label}</span>
                      <span className="timer-digits" aria-live="polite">
                        {formatTime(secondsLeft)}
                      </span>
                      <span className="timer-note">{config.note}</span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="mt-1 flex items-center justify-center gap-3">
              <button type="button" className="control-button control-button-secondary" onClick={resetTimer}>
                <RotateCcw size={16} />
                <span>Reset</span>
              </button>
              <button
                type="button"
                className="control-button control-button-primary"
                onClick={toggleRunning}
              >
                {isRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                <span>{isRunning ? "Pause" : "Start"}</span>
              </button>
            </div>

            <AnimatePresence>
              {isCompletePulse && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="completion-note"
                >
                  <Check size={13} /> Session complete · take the next breath
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <footer className="flex flex-col items-center justify-between gap-5 pb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/38 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-white/55">Today&apos;s rhythm</span>
            <div className="flex items-center gap-1.5" aria-label={`${sessionsInCycle} of 4 focus sessions complete`}>
              {[0, 1, 2, 3].map((item) => (
                <span key={item} className={`session-dot ${item < sessionsInCycle ? "session-dot-complete" : ""}`} />
              ))}
            </div>
            <span>{sessionsInCycle} / 04 sessions</span>
          </div>
          <button
            type="button"
            className="next-session group"
            onClick={() => chooseMode(getNextMode(mode, completedSessions))}
          >
            <span>Up next · {MODES[getNextMode(mode, completedSessions)].label}</span>
            <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </footer>
      </div>
    </div>
  );
}
