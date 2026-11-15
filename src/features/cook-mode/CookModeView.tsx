import {
  useState,
  useEffect,
  useMemo,
  type FC,
  type ReactElement,
  type FormEvent,
  type ChangeEvent
} from "react";
import type { Recipe, Step, Ingredient } from "../../domain/recipe/types";
import { scaleIngredient } from "../../domain/scaling/scaleIngredient";
import { detectTimersInText, formatTimerCountdown, type DetectedTimer } from "../../domain/recipe/timerDetector";
import { ClockIcon, XIcon, CheckIcon, PlusIcon, BookOpenIcon, ListIcon } from "../../ui/icons";
import { Button, IconButton } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { RichText } from "../../ui/RichText";
import styles from "./CookModeView.module.css";

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

type ActiveDrawer = "none" | "ingredients" | "steps" | "timers";

export const CookModeView: FC<CookModeViewProps> = ({
  recipe,
  multiplier,
  onClose
}): ReactElement => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>("none");
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
      navigator.wakeLock
        .request("screen")
        .then((sentinel: WakeLockSentinel): void => {
          wakeLockSentinel = sentinel;
        })
        .catch((): void => {
          // Wake lock not granted or supported
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
              const audioCtx = new (window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
    const totalSecs = customTimerMinutes * 60 + customTimerSeconds;
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
    setActiveTimers((prev: ActiveTimer[]): ActiveTimer[] =>
      prev.filter((t: ActiveTimer): boolean => t.id !== id)
    );
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
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        if (currentStepIndex < allSteps.length - 1) {
          setCompletedSteps((prev: Record<number, boolean>): Record<number, boolean> => ({
            ...prev,
            [currentStepIndex]: true
          }));
          setCurrentStepIndex((prev: number): number => prev + 1);
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev: number): number => prev - 1);
        }
      } else if (e.key === "Escape") {
        if (activeDrawer !== "none") {
          setActiveDrawer("none");
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStepIndex, allSteps.length, activeDrawer, onClose]);

  const progressPercent =
    allSteps.length > 0 ? Math.round(((currentStepIndex + 1) / allSteps.length) * 100) : 0;

  const totalIngredientsCount = recipe.ingredientGroups.reduce(
    (acc: number, g): number => acc + g.items.length,
    0
  );

  const toggleDrawer = (target: ActiveDrawer): void => {
    setActiveDrawer((prev: ActiveDrawer): ActiveDrawer => (prev === target ? "none" : target));
  };

  const handleNextStep = (): void => {
    setCompletedSteps((prev: Record<number, boolean>): Record<number, boolean> => ({
      ...prev,
      [currentStepIndex]: true
    }));
    if (currentStepIndex < allSteps.length - 1) {
      setCurrentStepIndex((prev: number): number => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrevStep = (): void => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev: number): number => prev - 1);
    }
  };

  return (
    <div className={styles.cookModeOverlay}>
      {/* Top progress line */}
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 56px Top Bar: [X exit] [title flex:1 ellipsis over "Step 3 of 11"] [timers] [ingredients] [steps] */}
      <header className={styles.topBar}>
        <IconButton
          variant="ghost"
          size="md"
          icon={<XIcon width={20} height={20} />}
          aria-label="Exit Cook Mode"
          onClick={onClose}
        />

        <div className={styles.topBarTitleArea}>
          <h2 className={styles.topBarTitle}>{recipe.title}</h2>
          <span className={styles.topBarSubtitle}>
            Step {currentStepIndex + 1} of {allSteps.length}
            {multiplier !== 1 && ` · ${multiplier}x scale`}
          </span>
        </div>

        <div className={styles.topBarActions}>
          <Button
            variant={activeDrawer === "timers" ? "primary" : "secondary"}
            size="sm"
            icon={<ClockIcon width={16} height={16} />}
            aria-label="Timers"
            onClick={(): void => toggleDrawer("timers")}
          >
            {activeTimers.length > 0 ? (
              <span>({activeTimers.length})</span>
            ) : null}
            <span className={styles.actionLabel}>Timers</span>
          </Button>

          <Button
            variant={activeDrawer === "ingredients" ? "primary" : "secondary"}
            size="sm"
            icon={<BookOpenIcon width={16} height={16} />}
            aria-label="Ingredients"
            onClick={(): void => toggleDrawer("ingredients")}
          >
            <span>({totalIngredientsCount})</span>
            <span className={styles.actionLabel}>Ingredients</span>
          </Button>

          <Button
            variant={activeDrawer === "steps" ? "primary" : "secondary"}
            size="sm"
            icon={<ListIcon width={16} height={16} />}
            aria-label="Steps"
            onClick={(): void => toggleDrawer("steps")}
          >
            <span>({currentStepIndex + 1}/{allSteps.length})</span>
            <span className={styles.actionLabel}>Steps</span>
          </Button>
        </div>
      </header>

      {/* Main Area: Large Step Display */}
      <main className={styles.mainArea}>
        <div className={styles.stepContent}>
          <div className={styles.stepNumber}>
            Step {currentStepIndex + 1} of {allSteps.length}
          </div>

          {currentStep && (
            <div className={styles.stepText}>
              <RichText content={currentStep.text} />
            </div>
          )}

          {currentStep?.note && (
            <div className={styles.stepNote}>
              Note: {currentStep.note}
            </div>
          )}

          {/* Inline detected timers */}
          {detectedTimers.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: "var(--space-4)" }}>
              {detectedTimers.map((dt: DetectedTimer): ReactElement => (
                <Button
                  key={dt.label}
                  variant="secondary"
                  size="sm"
                  icon={<ClockIcon width={15} height={15} />}
                  onClick={(): void => startTimer(dt)}
                >
                  Start {dt.label} ({Math.round(dt.seconds / 60)}m)
                </Button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating active timers strip */}
      {activeTimers.length > 0 && (
        <div
          style={{
            background: "var(--surface)",
            borderTop: "2px solid var(--accent)",
            padding: "8px 16px",
            display: "flex",
            gap: 12,
            overflowX: "auto",
            alignItems: "center"
          }}
        >
          {activeTimers.map((timer: ActiveTimer): ReactElement => (
            <div
              key={timer.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: timer.remainingSeconds === 0 ? "var(--danger)" : "var(--surface-alt)",
                color: timer.remainingSeconds === 0 ? "var(--accent-contrast)" : "var(--text)",
                padding: "4px 12px",
                borderRadius: "var(--radius-full)",
                fontSize: "0.875rem",
                fontWeight: 600
              }}
            >
              <span>{timer.label}:</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>
                {formatTimerCountdown(timer.remainingSeconds)}
              </span>
              <IconButton
                variant="ghost"
                size="sm"
                icon={<XIcon width={12} height={12} />}
                aria-label={`Close ${timer.label} timer`}
                onClick={(): void => removeTimer(timer.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* 56px Bottom Bar: Previous / Next Step */}
      <footer className={styles.bottomBar}>
        <Button
          variant="secondary"
          size="lg"
          onClick={handlePrevStep}
          disabled={currentStepIndex === 0}
        >
          Previous
        </Button>

        <Button
          variant="primary"
          size="lg"
          onClick={handleNextStep}
        >
          {currentStepIndex >= allSteps.length - 1 ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CheckIcon width={18} height={18} />
              Complete Cook Session
            </span>
          ) : (
            "Next Step"
          )}
        </Button>
      </footer>

      {/* Backdrop for open drawer */}
      {activeDrawer !== "none" && (
        <div
          className={styles.drawerBackdrop}
          onClick={(): void => setActiveDrawer("none")}
          aria-hidden="true"
        />
      )}

      {/* Ingredients Drawer */}
      {activeDrawer === "ingredients" && (
        <div className={styles.drawer}>
          <div className={styles.drawerHeader}>
            <h3 className={styles.drawerTitle}>
              Ingredients ({multiplier}x Scale)
            </h3>
            <IconButton
              variant="ghost"
              size="sm"
              icon={<XIcon width={18} height={18} />}
              aria-label="Close ingredients"
              onClick={(): void => setActiveDrawer("none")}
            />
          </div>

          <div className={styles.drawerBody}>
            {recipe.ingredientGroups.map((group, gIdx: number): ReactElement => (
              <div key={gIdx} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {group.heading && (
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "var(--muted)" }}>
                    {group.heading}
                  </span>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.items.map((item: Ingredient): ReactElement => {
                    const scaled = scaleIngredient(item, multiplier);
                    const isChecked = Boolean(checkedIngredients[item.id]);

                    return (
                      <label
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "6px 8px",
                          borderRadius: "var(--radius-sm)",
                          background: isChecked ? "transparent" : "var(--surface-alt)",
                          cursor: "pointer",
                          textDecoration: isChecked ? "line-through" : "none",
                          color: isChecked ? "var(--muted)" : "var(--text)",
                          fontSize: "0.9375rem"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(): void =>
                            setCheckedIngredients((prev: Record<string, boolean>): Record<string, boolean> => ({
                              ...prev,
                              [item.id]: !prev[item.id]
                            }))
                          }
                          style={{ width: 18, height: 18, cursor: "pointer" }}
                        />
                        <span>{scaled.formattedText}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps Overview Drawer */}
      {activeDrawer === "steps" && (
        <div className={styles.drawer}>
          <div className={styles.drawerHeader}>
            <h3 className={styles.drawerTitle}>
              Steps Overview
            </h3>
            <IconButton
              variant="ghost"
              size="sm"
              icon={<XIcon width={18} height={18} />}
              aria-label="Close steps overview"
              onClick={(): void => setActiveDrawer("none")}
            />
          </div>

          <div className={styles.drawerBody}>
            {allSteps.map((step: Step, idx: number): ReactElement => {
              const isCurrent = idx === currentStepIndex;
              const isDone = Boolean(completedSteps[idx]);

              return (
                <div
                  key={step.id || idx}
                  onClick={(): void => {
                    setCurrentStepIndex(idx);
                    setActiveDrawer("none");
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    background: isCurrent ? "var(--surface-alt)" : "transparent",
                    border: `1px solid ${isCurrent ? "var(--accent)" : "var(--border)"}`,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isDone}
                    onClick={(e): void => e.stopPropagation()}
                    onChange={(): void => toggleStepCompleted(idx)}
                    style={{ marginTop: 3, cursor: "pointer" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: isCurrent ? "var(--accent)" : "var(--muted)", textTransform: "uppercase" }}>
                      Step {idx + 1}
                    </div>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        lineHeight: 1.4,
                        textDecoration: isDone ? "line-through" : "none",
                        color: isDone ? "var(--muted)" : "var(--text)"
                      }}
                    >
                      {step.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timers Drawer */}
      {activeDrawer === "timers" && (
        <div className={styles.drawer}>
          <div className={styles.drawerHeader}>
            <h3 className={styles.drawerTitle}>Active & Custom Timers</h3>
            <IconButton
              variant="ghost"
              size="sm"
              icon={<XIcon width={18} height={18} />}
              aria-label="Close timers"
              onClick={(): void => setActiveDrawer("none")}
            />
          </div>

          <div className={styles.drawerBody}>
            <Button
              variant="primary"
              icon={<PlusIcon width={16} height={16} />}
              onClick={(): void => setShowCustomTimerModal(true)}
            >
              Add Countdown Timer
            </Button>

            {activeTimers.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", textAlign: "center", padding: "var(--space-4)" }}>
                No active countdown timers.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {activeTimers.map((timer: ActiveTimer): ReactElement => (
                  <div
                    key={timer.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      background: timer.remainingSeconds === 0 ? "var(--danger)" : "var(--surface-alt)",
                      color: timer.remainingSeconds === 0 ? "var(--accent-contrast)" : "var(--text)"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{timer.label}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem" }}>
                        {formatTimerCountdown(timer.remainingSeconds)}
                      </div>
                    </div>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={<XIcon width={16} height={16} />}
                      aria-label={`Dismiss ${timer.label}`}
                      onClick={(): void => removeTimer(timer.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Timer Dialog */}
      {showCustomTimerModal && (
        <Dialog
          isOpen
          title="New Countdown Timer"
          onClose={(): void => setShowCustomTimerModal(false)}
          maxWidth={380}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, width: "100%" }}>
              <Button
                variant="secondary"
                onClick={(): void => setShowCustomTimerModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleStartCustomTimer}
              >
                Start Timer
              </Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                LABEL
              </label>
              <input
                type="text"
                value={customTimerLabel}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setCustomTimerLabel(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)"
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                  MINUTES
                </label>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  value={customTimerMinutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                    setCustomTimerMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                  SECONDS
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customTimerSeconds}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                    setCustomTimerSeconds(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)"
                  }}
                />
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
