import { describe, it, expect } from "vitest";
import {
  formatDatedBackupFilename,
  parseBackupFilenameDate,
  getOldBackupsToPrune,
  shouldAutoBackup
} from "../src/domain/backup/backupFolder";

describe("Automatic Backup Folder Management", (): void => {
  it("formats dated backup filename with date and time", (): void => {
    const d = new Date(2026, 10, 12, 14, 30, 45); // Nov 12, 2026, 14:30:45
    const filename = formatDatedBackupFilename(d);
    expect(filename).toBe("openrecipebook-backup-2026-11-12-143045.zip");
  });

  it("parses date from valid backup filename", (): void => {
    const filename = "openrecipebook-backup-2026-11-12-143045.zip";
    const parsed = parseBackupFilenameDate(filename);
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(10); // 0-indexed November
    expect(parsed?.getDate()).toBe(12);

    const invalid = parseBackupFilenameDate("random-archive.zip");
    expect(invalid).toBeNull();
  });

  it("correctly identifies oldest backups to prune when exceeding keep count", (): void => {
    const files = [
      "openrecipebook-backup-2026-11-01-100000.zip",
      "openrecipebook-backup-2026-11-02-100000.zip",
      "openrecipebook-backup-2026-11-03-100000.zip",
      "openrecipebook-backup-2026-11-04-100000.zip",
      "openrecipebook-backup-2026-11-05-100000.zip",
      "openrecipebook-backup-2026-11-06-100000.zip",
      "openrecipebook-backup-2026-11-07-100000.zip",
      "openrecipebook-backup-2026-11-08-100000.zip",
      "openrecipebook-backup-2026-11-09-100000.zip",
      "openrecipebook-backup-2026-11-10-100000.zip",
      "openrecipebook-backup-2026-11-11-100000.zip",
      "openrecipebook-backup-2026-11-12-100000.zip"
    ];

    // Keeping 10 out of 12 should prune the 2 oldest (Nov 1 and Nov 2)
    const toPrune = getOldBackupsToPrune(files, 10);
    expect(toPrune).toHaveLength(2);
    expect(toPrune).toEqual([
      "openrecipebook-backup-2026-11-01-100000.zip",
      "openrecipebook-backup-2026-11-02-100000.zip"
    ]);

    // When under keep count, should return empty array
    const underLimit = getOldBackupsToPrune(files.slice(0, 5), 10);
    expect(underLimit).toHaveLength(0);
  });

  it("evaluates shouldAutoBackup based on last backup timestamp", (): void => {
    // If no backup ever run, should run
    expect(shouldAutoBackup(undefined)).toBe(true);
    expect(shouldAutoBackup("")).toBe(true);

    // If backup was 2 days ago, should run
    const twoDaysAgo = new Date(Date.now() - (48 * 60 * 60 * 1000)).toISOString();
    expect(shouldAutoBackup(twoDaysAgo)).toBe(true);

    // If backup was 1 hour ago, should not run
    const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000)).toISOString();
    expect(shouldAutoBackup(oneHourAgo)).toBe(false);
  });
});
