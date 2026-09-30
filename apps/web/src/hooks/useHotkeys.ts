import { useEffect, useRef } from 'react';

export type HotkeyHandler = (event: KeyboardEvent) => void;

function matches(event: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+').map((p) => p.trim());
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));
  const modDown = event.ctrlKey || event.metaKey;

  if (mods.has('mod')) {
    if (!modDown) return false;
  } else if (modDown) {
    return false;
  }

  if (mods.has('alt') !== event.altKey) return false;
  if (mods.has('shift') && !event.shiftKey) return false;

  const eventKey = event.key.toLowerCase();
  if (key === 'escape') return eventKey === 'escape';
  if (key === '?') return eventKey === '?' || (eventKey === '/' && event.shiftKey);
  if (key === '/') return eventKey === '/';
  return eventKey === key;
}

/** Global hotkeys. Use `mod+k` for ⌘K / Ctrl+K. */
export function useHotkeys(map: Record<string, HotkeyHandler>, enabled = true): void {
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTyping =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;

      for (const [combo, fn] of Object.entries(mapRef.current)) {
        if (matches(event, combo)) {
          if (isTyping && !combo.includes('escape') && !combo.includes('mod')) continue;
          event.preventDefault();
          fn(event);
          return;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}
