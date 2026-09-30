export type ClassValue = string | number | null | undefined | false | ClassValue[];

/** Minimal class-name joiner (no runtime dependencies). */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (input === null || input === undefined || input === false || input === '') continue;
    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else {
      out.push(String(input));
    }
  }
  return out.join(' ');
}
