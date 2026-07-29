// Burger Singh brand marks — wraps the ORIGINAL PNGs shipped from brand
// (BS_LOGO-01.png = horizontal lockup with wordmark, BS_LOGO-03.png = character
// mark alone). Never draw the logo — always render one of these two files.
//
// Aspect ratios are hard-coded from the source PNGs so the caller only has to
// pass one dimension:
//   Mark    — 1061 × 1682 → aspect ≈ 0.631
//   Lockup  — 4121 × 1682 → aspect ≈ 2.451

import { Image, type ImageStyle } from 'react-native';

// Pre-required so Metro bundles the asset URI once and caches it.
const MARK_SRC   = require('../../assets/burger-singh-mark.png');
const LOCKUP_SRC = require('../../assets/burger-singh-lockup.png');

const MARK_ASPECT   = 1061 / 1682; // ≈ 0.631 (width / height)
const LOCKUP_ASPECT = 4121 / 1682; // ≈ 2.451

interface Props {
  /** Rendered height in pixels. Width is derived from the source aspect ratio. */
  size?: number;
  /** Extra style overrides (e.g. margin, tintColor). */
  style?: ImageStyle;
}

export function BurgerSinghLogo({ size = 40, style }: Props) {
  return (
    <Image
      source={MARK_SRC}
      accessibilityLabel="Burger Singh"
      resizeMode="contain"
      style={[{ width: size * MARK_ASPECT, height: size }, style]}
    />
  );
}

export function BurgerSinghLockup({ size = 32, style }: Props) {
  return (
    <Image
      source={LOCKUP_SRC}
      accessibilityLabel="Burger Singh"
      resizeMode="contain"
      style={[{ width: size * LOCKUP_ASPECT, height: size }, style]}
    />
  );
}
