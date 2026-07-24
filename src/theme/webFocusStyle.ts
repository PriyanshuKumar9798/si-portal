// Web-only global CSS shim for keyboard focus indicators.
//
// RN Web strips the browser default `outline` on interactive elements —
// good for mouse users, terrible for accessibility. Brief §7 explicitly
// requires "focus states for web". This adds a branded 2-px red ring on
// `:focus-visible` so keyboard-nav users can see where they are. Mouse
// clicks don't trigger `:focus-visible` (spec behaviour), so this stays
// invisible for the majority-case mouse user.
//
// Runs ONCE on module import. No-op on native (native has its own focus
// story via TalkBack / VoiceOver).

import { Platform } from 'react-native';

const FOCUS_CSS = `
:focus-visible {
  outline: 2px solid #dc2626 !important;
  outline-offset: 2px !important;
  border-radius: 4px !important;
}
input:focus-visible, textarea:focus-visible {
  outline: 2px solid #dc2626 !important;
  outline-offset: 0 !important;
}
`;

export function installWebFocusStyles(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('si-portal-focus-shim')) return;
  const style = document.createElement('style');
  style.id = 'si-portal-focus-shim';
  style.textContent = FOCUS_CSS;
  document.head.appendChild(style);
}
