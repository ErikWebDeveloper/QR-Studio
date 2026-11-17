export function sanitizeFilename(
  input: string | undefined,
  fallback: string,
  extension?: string,
): string {
  const base = (input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/]/g, '-')
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '')
    .replace(/\.(png|svg|zip)$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 120)
    .trim();

  let name = base || fallback;
  if (extension) {
    name = `${name}.${extension}`;
  }
  return name;
}

export function uniqueFilename(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }

  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let counter = 2;
  let candidate = `${stem}-${counter}${ext}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `${stem}-${counter}${ext}`;
  }
  used.add(candidate);
  return candidate;
}
