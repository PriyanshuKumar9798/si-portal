// Close-on-outside-click hook. Web-only real click; on native the hook is a
// no-op (native popovers already close on backdrop tap via the platform).

import { useEffect, type RefObject } from 'react';
import { Platform } from 'react-native';

export function useOutsideClick(
  ref: RefObject<any>,
  active: boolean,
  onOutside: () => void,
): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;
    // pointerdown fires BEFORE any click, so we cancel-then-reopen races
    // (clicking one open popover's trigger while another is open closes
    // the other cleanly before the second toggles open).
    const handler = (e: Event) => {
      const node = ref.current as HTMLElement | null;
      const target = e.target as Node | null;
      if (!node || !target) return;
      if (node.contains(target)) return;
      onOutside();
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [ref, active, onOutside]);
}
