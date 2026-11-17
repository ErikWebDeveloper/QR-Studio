export interface ParsedEntry {
  data: string;
  filename: string;
  name: string;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(text: string): ParsedEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line, index) => {
      const [first = '', second = '', third = ''] = splitCSVLine(line);
      const isHeader =
        index === 0 && /^(url|data|content|link)$/i.test(first) && /filename|name/i.test(second + third);
      if (isHeader) return null;
      return {
        data: first,
        filename: second,
        name: third,
      };
    })
    .filter((entry): entry is ParsedEntry => entry !== null && entry.data.length > 0);
}

export function parseJSONEntries(text: string): ParsedEntry[] {
  const parsed = JSON.parse(text) as unknown;
  const rows = Array.isArray(parsed)
    ? parsed
    : (parsed as { items?: unknown[] }).items ?? [];
  if (!Array.isArray(rows)) {
    throw new Error('Expected an array of entries or an object with "items".');
  }
  return rows.map((row, index) => {
    if (typeof row === 'string') {
      return { data: row, filename: `qr-${index + 1}`, name: '' };
    }
    if (!row || typeof row !== 'object') {
      throw new Error(`Entry ${index + 1} is not an object.`);
    }
    const item = row as Record<string, unknown>;
    const data = item.data ?? item.url ?? item.content ?? item.link;
    if (typeof data !== 'string') {
      throw new Error(`Entry ${index + 1} is missing "data".`);
    }
    return {
      data,
      filename: typeof item.filename === 'string' ? item.filename : `qr-${index + 1}`,
      name: typeof item.name === 'string' ? item.name : '',
    };
  });
}

export function parseManualEntries(text: string): ParsedEntry[] {
  return parseCSV(text);
}
