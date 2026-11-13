import { describe, it, expect } from "vitest";
import { detectTimersInText, formatTimerCountdown } from "../src/domain/recipe/timerDetector";

describe("Timer Duration Detection", (): void => {
  it("detects minute durations in step text", (): void => {
    const text = "Bake in the preheated oven for 25 minutes until golden brown.";
    const timers = detectTimersInText(text);
    expect(timers).toHaveLength(1);
    expect(timers[0].seconds).toBe(25 * 60);
    expect(timers[0].label).toContain("25 minutes");
  });

  it("detects range minutes and takes upper limit", (): void => {
    const text = "Simmer uncovered for 10-15 minutes.";
    const timers = detectTimersInText(text);
    expect(timers).toHaveLength(1);
    expect(timers[0].seconds).toBe(15 * 60);
  });

  it("detects hour and minute durations", (): void => {
    const text = "Roast for 1 hour 30 mins until tender.";
    const timers = detectTimersInText(text);
    expect(timers).toHaveLength(1);
    expect(timers[0].seconds).toBe(90 * 60);
  });

  it("formats countdown seconds cleanly into mm:ss", (): void => {
    expect(formatTimerCountdown(125)).toBe("2:05");
    expect(formatTimerCountdown(59)).toBe("0:59");
    expect(formatTimerCountdown(0)).toBe("0:00");
  });
});
