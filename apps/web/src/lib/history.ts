export interface SavedDesign {
  id: string;
  name: string;
  data: string;
  design: unknown;
  createdAt: string;
}

const HISTORY_KEY = 'qr-studio:history';

export function getHistory(): SavedDesign[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedDesign[];
    return Array.isArray(parsed) ? parsed.slice(0, 24) : [];
  } catch {
    return [];
  }
}

export function saveDesign(entry: SavedDesign): SavedDesign[] {
  const next = [entry, ...getHistory().filter((item) => item.id !== entry.id)].slice(
    0,
    24,
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function removeDesign(id: string): SavedDesign[] {
  const next = getHistory().filter((item) => item.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}
