export interface DetectedTimer {
  label: string;
  seconds: number;
}

export function detectTimersInText(text: string): DetectedTimer[] {
  const timers: DetectedTimer[] = [];

  // Match: e.g. "1 hr 15 min" or "2 hours"
  const hourMinPattern = /\b(\d+)\s*(?:hours?|hrs?)\s*(?:and\s*)?(\d+)?\s*(?:minutes?|mins?)?\b/gi;
  let hourMatch: RegExpExecArray | null;
  while ((hourMatch = hourMinPattern.exec(text)) !== null) {
    const hours = parseInt(hourMatch[1], 10);
    const mins = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
    const totalSeconds = (hours * 60 + mins) * 60;
    timers.push({
      label: hourMatch[0].trim(),
      seconds: totalSeconds
    });
  }

  // Match: e.g. "25 minutes", "10-15 minutes", "30 mins"
  const minPattern = /\b(\d+)(?:\s*(?:-|to)\s*(\d+))?\s*(?:minutes|minute|mins|min)\b/gi;
  let minMatch: RegExpExecArray | null;
  while ((minMatch = minPattern.exec(text)) !== null) {
    // Avoid re-matching parts of hour pattern
    const minutes = parseInt(minMatch[2] || minMatch[1], 10);
    const totalSeconds = minutes * 60;
    if (!timers.some((t) => t.label.includes(minMatch![0].trim()))) {
      timers.push({
        label: minMatch[0].trim(),
        seconds: totalSeconds
      });
    }
  }

  // Match: e.g. "45 seconds", "30 secs"
  const secPattern = /\b(\d+)\s*(?:seconds|second|secs|sec)\b/gi;
  let secMatch: RegExpExecArray | null;
  while ((secMatch = secPattern.exec(text)) !== null) {
    const seconds = parseInt(secMatch[1], 10);
    timers.push({
      label: secMatch[0].trim(),
      seconds
    });
  }

  return timers;
}

export function formatTimerCountdown(remainingSeconds: number): string {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  return `${mins}:${paddedSecs}`;
}
