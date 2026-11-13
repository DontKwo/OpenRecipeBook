import { useState, useEffect, useMemo, type FC, type ReactElement, type FormEvent } from "react";
import type { Recipe, Step } from "../../domain/recipe/types";
import { scaleIngredient } from "../../domain/scaling/scaleIngredient";
import { detectTimersInText, formatTimerCountdown, type DetectedTimer } from "../../domain/recipe/timerDetector";
import { ClockIcon, XIcon, CheckIcon, PlusIcon } from "../../ui/icons";

export interface CookModeViewProps {
  recipe: Recipe;
  multiplier: number;
  onClose: () => void;
}

interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
}

export const CookModeView: FC<CookModeViewProps> = ({
  recipe,
  multiplier,
  onClose
}): ReactElement => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [showIngredientsDrawer, setShowIngredientsDrawer] = useState<boolean>(false);
  const [showStepDrawer, setShowStepDrawer] = useState<boolean>(false);
  const [showCustomTimerModal, setShowCustomTimerModal] = useState<boolean>(false);
  const [customTimerMinutes, setCustomTimerMinutes] = useState<number>(5);
  const [customTimerSeconds, setCustomTimerSeconds] = useState<number>(0);
  const [customTimerLabel, setCustomTimerLabel] = useState<string>("Custom");
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Flatten all steps across direction groups
  const allSteps: Step[] = useMemo((): Step[] => {
    const list: Step[] = [];
    for (const group of recipe.directionGroups) {
      for (const step of group.steps) {
        list.push(step);
      }
    }
    return list;
  }, [recipe]);

  const currentStep = allSteps[currentStepIndex];

  // Screen Wake Lock
  useEffect(() => {
    let wakeLockSentinel: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then((sentinel: WakeLockSentinel): void => {
        wakeLockSentinel = sentinel;
      }).catch((): void => {
        // WakeLock not granted or supported
      });
    }

    return () => {
      wakeLockSentinel?.release().catch((): void => {});
    };
  }, []);

  // Timer interval ticker
  useEffect(() => {
    if (activeTimers.length === 0) return;

    const intervalId = window.setInterval((): void => {
      setActiveTimers((prev: ActiveTimer[]): ActiveTimer[] => {
        return prev.map((timer: ActiveTimer): ActiveTimer => {
          if (timer.remainingSeconds <= 1) {
            try {
              const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              osc.type = "sine";
              osc.frequency.setValueAtTime(880, audioCtx.currentTime);
              osc.connect(audioCtx.destination);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.6);
            } catch {
              // Audio context not available
            }
            return { ...timer, remainingSeconds: 0 };
          }
          return { ...timer, remainingSeconds: timer.remainingSeconds - 1 };
        });
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeTimers.length]);

  const detectedTimers = useMemo((): DetectedTimer[] => {
    if (!currentStep) return [];
    return detectTimersInText(currentStep.text);
  }, [currentStep]);

  const startTimer = (timer: DetectedTimer): void => {
    const newTimer: ActiveTimer = {
      id: `timer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: timer.label,
      totalSeconds: timer.seconds,
      remainingSeconds: timer.seconds
    };
    setActiveTimers((prev: ActiveTimer[]): ActiveTimer[] => [...prev, newTimer]);
  };

  const handleStartCustomTimer = (e: FormEvent): void => {
    e.preventDefault();
    const totalSecs = (customTimerMinutes * 60) + customTimerSeconds;
    if (totalSecs <= 0) return;

    const newTimer: ActiveTimer = {
      id: `timer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: customTimerLabel.trim() || "Custom",
      totalSeconds: totalSecs,
      remainingSeconds: totalSecs
    };
    setActiveTimers((prev: ActiveTimer[]): ActiveTimer[] => [...prev, newTimer]);
    setShowCustomTimerModal(false);
  };

  const removeTimer = (id: string): void => {
    setActiveTimers((prev: ActiveTimer[]): ActiveTimer[] => prev.filter((t: ActiveTimer): boolean => t.id !== id));
  };

  const toggleStepCompleted = (index: number): void => {
    setCompletedSteps((prev: Record<number, boolean>): Record<number, boolean> => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        if (currentStepIndex < allSteps.length - 1) {
          setCurrentStepIndex((prev: number): number => prev + 1);
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev: number): number => prev - 1);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStepIndex, allSteps.length, onClose]);

  const progressPercent = allSteps.length > 0
    ? Math.round(((currentStepIndex + 1) / allSteps.length) * 100)
    : 0;

  const totalIngredientsCount = recipe.ingredientGroups.reduce(
    (acc: number, g): number => acc + g.items.length,
    0
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        color: "var(--text)",
        overflow: "hidden"
      }}
    >
      {/* Top progress bar */}
      <div style={{ width: "100%", height: "4px", background: "var(--border)" }}>
        <div
          style={{
            height: "100%",
            width: `${progressPercent}%`,
            background: "var(--accent)",
            transition: "width 0.25s ease"
          }}
        />
      </div>

      {/* Top Bar */}
      <div
        style={{
          padding: "var(--space-4) var(--space-6)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)"
        }}
      >
        <div>
          <span style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700, letterSpacing: "1px" }}>
            Cook Mode · {multiplier}× Scale
          </span>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", margin: 0 }}>
            {recipe.title}
          </h2>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          {/* Step overview drawer toggle */}
          <button
            type="button"
            onClick={(): void => setShowStepDrawer(!showStepDrawer)}
            style={{
              background: showStepDrawer ? "var(--surface-alt)" : "var(--surface)",
              color: showStepDrawer ? "var(--accent)" : "var(--text)",
              border: "1px solid var(--border)",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.85rem"
            }}
          >
            Steps ({currentStepIndex + 1}/{allSteps.length})
          </button>

          {/* Add custom timer button */}
          <button
            type="button"
            onClick={(): void => setShowCustomTimerModal(true)}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.85rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
            title="Create custom countdown timer"
          >
            <ClockIcon width={14} height={14} /> + Timer
          </button>

          {/* Ingredients drawer toggle */}
          <button
            type="button"
            onClick={(): void => setShowIngredientsDrawer(!showIngredientsDrawer)}
            style={{
              background: showIngredientsDrawer ? "var(--surface-alt)" : "var(--surface)",
              color: showIngredientsDrawer ? "var(--accent)" : "var(--text)",
              border: "1px solid var(--border)",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.85rem"
            }}
          >
            Ingredients ({totalIngredientsCount})
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-full)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              marginLeft: "var(--space-2)"
            }}
            aria-label="Exit Cook Mode"
          >
            <XIcon width={18} height={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Step Display */}
        <div style={{ flex: 1, padding: "var(--space-10) var(--space-8)", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: "900px", margin: "0 auto", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
            <div style={{ fontSize: "1.1rem", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>
              Step {currentStepIndex + 1} of {allSteps.length}
            </div>

            <button
              type="button"
              onClick={(): void => toggleStepCompleted(currentStepIndex)}
              style={{
                background: completedSteps[currentStepIndex] ? "var(--accent)" : "var(--surface)",
                color: completedSteps[currentStepIndex] ? "var(--accent-contrast)" : "var(--muted)",
                border: "1px solid " + (completedSteps[currentStepIndex] ? "var(--accent)" : "var(--border)"),
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <CheckIcon width={14} height={14} /> {completedSteps[currentStepIndex] ? "Completed" : "Mark Done"}
            </button>
          </div>

          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)",
              lineHeight: 1.4,
              marginBottom: currentStep?.note ? "var(--space-4)" : "var(--space-8)",
              textDecoration: completedSteps[currentStepIndex] ? "line-through" : "none",
              opacity: completedSteps[currentStepIndex] ? 0.7 : 1
            }}
          >
            {currentStep?.text}
          </div>

          {currentStep?.note && (
            <div
              style={{
                padding: "var(--space-3) var(--space-4)",
                background: "var(--surface-alt)",
                borderLeft: "4px solid var(--accent)",
                borderRadius: "var(--radius-sm)",
                fontSize: "1.1rem",
                color: "var(--text)",
                marginBottom: "var(--space-8)",
                fontStyle: "italic"
              }}
            >
              Note: {currentStep.note}
            </div>
          )}

          {/* Detected Timers for Step */}
          {detectedTimers.length > 0 && (
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-6)" }}>
              {detectedTimers.map((timer: DetectedTimer, index: number): ReactElement => (
                <button
                  key={index}
                  type="button"
                  onClick={(): void => startTimer(timer)}
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-contrast)",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 600,
                    fontSize: "1.05rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "var(--shadow-md)"
                  }}
                >
                  <ClockIcon width={20} height={20} /> Start {timer.label} Timer
                </button>
              ))}
            </div>
          )}

          {/* Step Navigation Controls */}
          <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "auto" }}>
            <button
              type="button"
              disabled={currentStepIndex === 0}
              onClick={(): void => setCurrentStepIndex((prev: number): number => prev - 1)}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontSize: "1.1rem",
                fontWeight: 600,
                cursor: currentStepIndex === 0 ? "not-allowed" : "pointer",
                opacity: currentStepIndex === 0 ? 0.5 : 1
              }}
            >
              &larr; Previous Step
            </button>

            <button
              type="button"
              disabled={currentStepIndex >= allSteps.length - 1}
              onClick={(): void => {
                setCompletedSteps((prev: Record<number, boolean>): Record<number, boolean> => ({
                  ...prev,
                  [currentStepIndex]: true
                }));
                setCurrentStepIndex((prev: number): number => prev + 1);
              }}
              style={{
                flex: 2,
                padding: "16px",
                borderRadius: "var(--radius-full)",
                border: "none",
                background: "var(--accent)",
                color: "var(--accent-contrast)",
                fontSize: "1.1rem",
                fontWeight: 600,
                cursor: currentStepIndex >= allSteps.length - 1 ? "not-allowed" : "pointer",
                opacity: currentStepIndex >= allSteps.length - 1 ? 0.5 : 1
              }}
            >
              {currentStepIndex >= allSteps.length - 1 ? "Finished Cooking!" : "Next Step \u2192"}
            </button>
          </div>
        </div>

        {/* Slide-out Step Overview Drawer */}
        {showStepDrawer && (
          <div
            style={{
              width: "360px",
              background: "var(--surface)",
              borderLeft: "1px solid var(--border)",
              padding: "var(--space-6)",
              overflowY: "auto",
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", margin: 0 }}>
                Steps Overview
              </h3>
              <button
                type="button"
                onClick={(): void => setShowStepDrawer(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                aria-label="Close steps overview"
              >
                <XIcon width={16} height={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {allSteps.map((step: Step, idx: number) => {
                const isCurrent = idx === currentStepIndex;
                const isDone = completedSteps[idx];

                return (
                  <div
                    key={step.id || idx}
                    onClick={(): void => {
                      setCurrentStepIndex(idx);
                      setShowStepDrawer(false);
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      background: isCurrent ? "var(--surface-alt)" : "transparent",
                      border: "1px solid " + (isCurrent ? "var(--accent)" : "var(--border)"),
                      cursor: "pointer",
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-start"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!isDone}
                      onClick={(e): void => e.stopPropagation()}
                      onChange={(): void => toggleStepCompleted(idx)}
                      style={{ marginTop: "3px", cursor: "pointer" }}
                    />

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: isCurrent ? "var(--accent)" : "var(--muted)", textTransform: "uppercase" }}>
                        Step {idx + 1}
                      </div>
                      <div
                        style={{
                          fontSize: "0.88rem",
                          lineHeight: 1.35,
                          marginTop: "2px",
                          textDecoration: isDone ? "line-through" : "none",
                          color: isDone ? "var(--muted)" : "var(--text)",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical"
                        }}
                      >
                        {step.text}
                      </div>
                      {step.note && (
                        <div style={{ fontSize: "0.78rem", fontStyle: "italic", color: "var(--muted)", marginTop: "2px" }}>
                          Note: {step.note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Slide-out Ingredients Panel */}
        {showIngredientsDrawer && (
          <div
            style={{
              width: "350px",
              background: "var(--surface)",
              borderLeft: "1px solid var(--border)",
              padding: "var(--space-6)",
              overflowY: "auto",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", margin: 0 }}>
                Ingredients ({multiplier}×)
              </h3>
              <button
                type="button"
                onClick={(): void => setShowIngredientsDrawer(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                aria-label="Close ingredients"
              >
                <XIcon width={16} height={16} />
              </button>
            </div>

            {recipe.ingredientGroups.map((group, groupIndex: number) => (
              <div key={groupIndex} style={{ marginBottom: "var(--space-4)" }}>
                {group.heading && (
                  <h4 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                    {group.heading}
                  </h4>
                )}
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {group.items.map((item) => {
                    const scaled = scaleIngredient(item, multiplier);
                    const isChecked = !!checkedIngredients[item.id];
                    return (
                      <li
                        key={item.id}
                        onClick={(): void => setCheckedIngredients((p): Record<string, boolean> => ({ ...p, [item.id]: !p[item.id] }))}
                        style={{
                          padding: "6px 0",
                          cursor: "pointer",
                          textDecoration: isChecked ? "line-through" : "none",
                          color: isChecked ? "var(--muted)" : "var(--text)",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        <input type="checkbox" checked={isChecked} onChange={(): void => {}} style={{ cursor: "pointer" }} />
                        <span>{scaled.formattedText}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Active Timers Bar */}
      {activeTimers.length > 0 && (
        <div
          style={{
            background: "var(--surface)",
            borderTop: "2px solid var(--accent)",
            padding: "var(--space-3) var(--space-6)",
            display: "flex",
            gap: "var(--space-4)",
            overflowX: "auto"
          }}
        >
          {activeTimers.map((timer: ActiveTimer) => (
            <div
              key={timer.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-3)",
                background: timer.remainingSeconds === 0 ? "var(--danger)" : "var(--surface-alt)",
                color: timer.remainingSeconds === 0 ? "var(--accent-contrast)" : "var(--text)",
                padding: "8px 16px",
                borderRadius: "var(--radius-full)",
                fontWeight: 600
              }}
            >
              <span>{timer.label}:</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem" }}>
                {formatTimerCountdown(timer.remainingSeconds)}
              </span>
              <button
                type="button"
                onClick={(): void => removeTimer(timer.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  marginLeft: "4px"
                }}
                aria-label="Remove timer"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Custom Timer Modal */}
      {showCustomTimerModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "var(--space-4)"
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-6)",
              maxWidth: "380px",
              width: "100%",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", margin: "0 0 var(--space-3) 0" }}>
              Add Countdown Timer
            </h3>
            <form onSubmit={handleStartCustomTimer} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Timer Label
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={customTimerLabel}
                  onChange={(e): void => setCustomTimerLabel(e.target.value)}
                  placeholder="e.g. Rest meat, Simmer, Boil pasta"
                  style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)" }}
                />
              </div>

              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                    Minutes
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1440}
                    value={customTimerMinutes}
                    onChange={(e): void => setCustomTimerMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                    Seconds
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={customTimerSeconds}
                    onChange={(e): void => setCustomTimerSeconds(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)" }}
                  />
                </div>
              </div>

              {/* Quick minute preset buttons */}
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {[1, 3, 5, 10, 15, 30].map((mins: number) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={(): void => {
                      setCustomTimerMinutes(mins);
                      setCustomTimerSeconds(0);
                    }}
                    style={{
                      flex: 1,
                      background: customTimerMinutes === mins && customTimerSeconds === 0 ? "var(--accent)" : "var(--surface-alt)",
                      color: customTimerMinutes === mins && customTimerSeconds === 0 ? "var(--accent-contrast)" : "var(--text)",
                      border: "1px solid var(--border)",
                      padding: "4px 0",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                <button
                  type="button"
                  onClick={(): void => setShowCustomTimerModal(false)}
                  style={{ background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "var(--radius-full)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-contrast)",
                    border: "none",
                    padding: "8px 18px",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <PlusIcon width={14} height={14} /> Start Timer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
