export interface GroupedWarning {
  key: string;
  message: string;
  count: number;
  rawLines: string[];
}

/**
 * Normalizes a warning line by removing timestamps and normalizing whitespace
 * so repeated warnings from different skills/times group together by their underlying cause.
 */
export function normalizeWarningMessage(line: string): string {
  let normalized = line.trim();

  // Strip leading timestamps if present:
  // e.g. "2026-09-12 19:26:13,243 - " or "[2026-09-12T19:26:13Z] "
  normalized = normalized.replace(
    /^\[?\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[,\.]\d+)?(?:Z|[+-]\d{2}:?\d{2})?\]?\s*[-:]?\s*/i,
    ''
  );

  // Normalize consecutive whitespace
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}

/**
 * Groups repeated warning lines by their normalized message / cause,
 * tracking the occurrence count and preserving all original raw lines.
 */
export function groupWarnings(warnings: (string | null | undefined)[]): GroupedWarning[] {
  const groups = new Map<string, GroupedWarning>();

  for (const raw of warnings) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const key = normalizeWarningMessage(trimmed);
    const existing = groups.get(key);

    if (existing) {
      existing.count += 1;
      existing.rawLines.push(raw);
    } else {
      groups.set(key, {
        key,
        message: trimmed,
        count: 1,
        rawLines: [raw],
      });
    }
  }

  return Array.from(groups.values());
}
