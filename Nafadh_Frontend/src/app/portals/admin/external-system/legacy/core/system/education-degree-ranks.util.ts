export interface EducationDegreeRankLevel {
  rank: number;
  labels: string[];
}

export const DEFAULT_EDUCATION_DEGREE_RANKS: EducationDegreeRankLevel[] = [
  { rank: 1, labels: ['دكتوراه', 'PhD', 'Doctorate (PhD)'] },
  { rank: 2, labels: ['ماجستير', "Master's degree", 'Master'] },
  { rank: 3, labels: ['بكالوريوس', "Bachelor's degree", 'Bachelor'] },
  { rank: 4, labels: ['الدبلوم العالي', 'Higher Diploma'] },
  { rank: 5, labels: ['دبلوم تعليم العام', 'دبلوم', 'Diploma'] },
  { rank: 6, labels: ['الثانوية العامة', 'High School'] },
];

export function defaultEducationDegreeRanksJson(): string {
  return serializeEducationDegreeRanks(DEFAULT_EDUCATION_DEGREE_RANKS);
}

export function parseEducationDegreeRanks(json: string | null | undefined): EducationDegreeRankLevel[] | null {
  const raw = (json ?? '').toString().trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    const cleaned: EducationDegreeRankLevel[] = [];
    const ordered = [...parsed].sort((a, b) => {
      const ra = typeof (a as { rank?: unknown })?.rank === 'number' ? (a as { rank: number }).rank : Number.MAX_SAFE_INTEGER;
      const rb = typeof (b as { rank?: unknown })?.rank === 'number' ? (b as { rank: number }).rank : Number.MAX_SAFE_INTEGER;
      return ra - rb;
    });

    for (const row of ordered) {
      const labels = distinctLabels((row as { labels?: unknown })?.labels);
      if (labels.length === 0) {
        continue;
      }
      cleaned.push({ rank: cleaned.length + 1, labels });
    }

    return cleaned;
  } catch {
    return null;
  }
}

export function serializeEducationDegreeRanks(levels: EducationDegreeRankLevel[]): string {
  const rows = (levels ?? [])
    .map((row, i) => ({
      rank: i + 1,
      labels: distinctLabels(row?.labels),
    }))
    .filter((row) => row.labels.length > 0);
  return JSON.stringify(rows);
}

export function canonicalizeEducationDegreeRanks(json: string | null | undefined): string | null {
  const parsed = parseEducationDegreeRanks(json);
  if (parsed == null || parsed.length === 0) {
    return null;
  }
  return serializeEducationDegreeRanks(parsed);
}

export function educationDegreeRanksCount(json: string | null | undefined): number | null {
  const parsed = parseEducationDegreeRanks(json);
  return parsed == null ? null : parsed.length;
}

function distinctLabels(labels: unknown): string[] {
  if (!Array.isArray(labels)) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of labels) {
    const trimmed = String(item ?? '').trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
