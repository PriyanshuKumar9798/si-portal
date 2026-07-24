// UI kit — every primitive the design uses, extracted into RN-friendly
// components that read from the theme context. The visual language is a
// direct port of the Claude Design output (SiListFrame.dc.html) for the
// components it drew (Chip, StatusChip, MetricCard, SectionCard, Button)
// and follows the same conventions for those it didn't (Field, Banner,
// DialogShell, MultiSelectPill).

import { type ReactNode } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, TextInput, ScrollView,
  useWindowDimensions,
  type ViewStyle, type TextStyle, type StyleProp,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, space, weight, fontFamily } from '../theme/tokens';
import { IconFileEmpty, IconAlert } from './icons';
import { Tooltip } from './Tooltip';

// Responsive breakpoints — the app targets desktop first (this is a franchise
// ops tool, not a phone-native product), but every screen must remain usable
// on a phone browser so store managers can spot-check from the floor.
//   phone: <640    (single column, tight paddings, table scrolls horizontally)
//   tablet: 640-1024 (two-up cards, wrap where useful)
//   desktop: 1024+ (full 3-up layouts, generous paddings)
export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    width,
    isPhone: width < 640,
    isTabletOrBelow: width < 1024,
  };
}

// ─── Primitives ─────────────────────────────────────────────────────────────

/** Body text — auto-picks theme colour. Pass `mut` for muted labels. */
export function Body({
  children, mut, style, size = 'body', wt = 'regular', numeric,
}: {
  children: ReactNode;
  mut?: boolean;
  style?: StyleProp<TextStyle>;
  size?: keyof typeof font;
  wt?: keyof typeof weight;
  numeric?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Text
      style={[
        {
          color: mut ? c.mut : c.fg,
          fontSize: font[size],
          fontWeight: weight[wt] as TextStyle['fontWeight'],
          fontFamily,
          fontVariant: numeric ? ['tabular-nums'] : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Micro uppercase label — the tiny caption above every hero number. */
export function MicroLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return (
    <Text style={[{
      color: c.mut,
      fontSize: font.micro,
      fontWeight: weight.medium as TextStyle['fontWeight'],
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontFamily,
    }, style]}>{children}</Text>
  );
}

// ─── Button ────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label, onPress, variant = 'primary', leading, disabled, loading, fullWidth,
  emphasis, tooltip, accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  leading?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** `high` = ring + slightly larger padding to draw the eye. Used on
   *  Save all when there are unsaved edits — the button changes SHAPE, not
   *  colour, so it reads as "important right now" without new hues. */
  emphasis?: 'normal' | 'high';
  /** Hover-tooltip copy explaining what the button does. Especially useful
   *  on destructive / impactful CTAs like Lock, Delete draft, Save all. */
  tooltip?: string;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const bg =
    variant === 'primary' ? c.redSolid :
    variant === 'danger'  ? 'transparent' :
    variant === 'ghost'   ? 'transparent' :
                            c.card;
  const border =
    variant === 'primary' ? c.redSolid :
    variant === 'ghost'   ? 'transparent' :
    variant === 'danger'  ? c.chipRedBorder :
                            c.border;
  const fg =
    variant === 'primary' ? '#ffffff' :
    variant === 'danger'  ? c.rTx :
                            c.fg;
  // `emphasis=high` = subtle outer ring + a hair more vertical padding. Draws
  // the eye without adding a new colour. Used when the button represents a
  // pending action (unsaved edits → Save all).
  const highRing = emphasis === 'high' && !disabled;
  const btn = (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ hovered, pressed }) => ([
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: emphasis === 'high' ? 10 : 9,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          opacity: disabled ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        } as ViewStyle,
        highRing ? {
          // 2-px outer ring — implemented as an extra shadow-like outline via
          // a light-red halo (rgba of c.redSolid). Reads as "attention" not
          // "error" because it's outside the button, not filling it.
          shadowColor: c.redSolid,
          shadowOpacity: 0.28,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          // RN Web: elevation is ignored, shadow* is the actual effect.
        } as ViewStyle : null,
        (hovered as boolean) && !disabled ? { opacity: 0.9 } : null,
        (pressed as boolean) && !disabled ? { transform: [{ scale: 0.98 }] } : null,
      ])}
    >
      {loading
        ? <ActivityIndicator size="small" color={fg} />
        : leading}
      <Text style={{
        color: fg,
        fontSize: font.body,
        fontWeight: weight.semibold as TextStyle['fontWeight'],
        fontFamily,
      }}>{label}</Text>
    </Pressable>
  );
  if (!tooltip) return btn;
  return <Tooltip label={tooltip}>{btn}</Tooltip>;
}

// ─── Chip / StatusChip ─────────────────────────────────────────────────────

export type StatusTone = 'draft' | 'locked' | 'error' | 'neutral';

export function StatusChip({ tone, label }: { tone: StatusTone; label?: string }) {
  const { c } = useTheme();
  const cfg =
    tone === 'draft'  ? { tx: c.yTx, bg: c.yBg, dot: c.yDot, dflt: 'Draft' } :
    tone === 'locked' ? { tx: c.gTx, bg: c.gBg, dot: c.gDot, dflt: 'Locked' } :
    tone === 'error'  ? { tx: c.rTx, bg: c.rBg, dot: c.rDot, dflt: 'Error' } :
                        { tx: c.sTx, bg: c.sBg, dot: c.mut,  dflt: '–' };
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 5,
      alignSelf: 'flex-start',
      backgroundColor: cfg.bg,
      paddingVertical: 2,
      paddingHorizontal: 9,
      borderRadius: radius.pill,
    }}>
      <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: cfg.dot }} />
      <Text style={{
        color: cfg.tx, fontSize: font.caption,
        fontWeight: weight.semibold as TextStyle['fontWeight'],
        fontFamily,
      }}>{label ?? cfg.dflt}</Text>
    </View>
  );
}

/** Neutral chip — the "Manual" / "Auto" origin badge, or any metadata tag. */
export function MetaChip({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{
      backgroundColor: c.sBg,
      alignSelf: 'flex-start',
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: radius.pill,
    }}>
      <Text style={{
        color: c.sTx, fontSize: font.caption,
        fontWeight: weight.semibold as TextStyle['fontWeight'],
        fontFamily,
      }}>{label}</Text>
    </View>
  );
}

/** Active-filter chip — the "Run date: 21 Jul 2026 ×" pill shown under a
 *  SectionCard header, following the BS FA convention. */
export function FilterChip({
  label, onClear,
}: { label: string; onClear?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: c.chipRedBorder,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: radius.pill,
    }}>
      <Text style={{ color: c.red, fontSize: font.small, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>{label}</Text>
      {onClear && (
        <Pressable onPress={onClear} accessibilityLabel="Clear filter" hitSlop={6}>
          <Text style={{ color: c.red, fontSize: font.small, fontWeight: weight.bold as TextStyle['fontWeight'], fontFamily }}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Card / SectionCard ────────────────────────────────────────────────────

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: radius.lg,
      overflow: 'hidden',
    }, style]}>{children}</View>
  );
}

/** SectionCard — the wrapper for every content block. */
export function SectionCard({
  title, subtitle, action, filterChips, children, style, contentPadding = true,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  filterChips?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentPadding?: boolean;
}) {
  const { c } = useTheme();
  const { isPhone } = useBreakpoint();
  // Header row: on phones, `flexWrap: 'wrap'` drops the action below the
  // title+subtitle stack. The action View also grows to `alignSelf: stretch`
  // via minWidth so full-width CTAs (Generate SIs) don't sit awkwardly narrow.
  return (
    <Card style={style}>
      <View style={{
        padding: isPhone ? 14 : 18,
        paddingBottom: 14,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
      }}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Body size="h3" wt="semibold">{title}</Body>
          {subtitle && <Body size="body" mut style={{ marginTop: 4 }}>{subtitle}</Body>}
        </View>
        {action}
      </View>
      {filterChips && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Text style={{ color: c.mut, fontSize: font.caption, fontFamily }}>Filtered by</Text>
          {filterChips}
        </View>
      )}
      <View style={contentPadding ? { padding: 0, borderTopColor: c.border, borderTopWidth: 1 } : undefined}>
        {children}
      </View>
    </Card>
  );
}

// ─── MetricCard ────────────────────────────────────────────────────────────

export function MetricCard({
  label, value, hint, icon, iconTone, style,
}: {
  label: string;
  value: string | number;
  /** Short one-line supplementary context — e.g. "63% of today" or a date.
   *  Sits directly below the hero number. Prefer a ratio/date over a
   *  redundant status chip (a "Drafts awaiting review" card doesn't need a
   *  "Draft" chip next to its number). */
  hint?: string;
  /** Optional lucide-style icon rendered as a tinted square in the top-left
   *  corner of the card. Gives each metric a distinct visual identity without
   *  the noise of an inline chip. */
  icon?: ReactNode;
  /** Colour family for the icon tile. Defaults to slate (neutral). */
  iconTone?: 'neutral' | 'draft' | 'locked' | 'red';
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const iconBg =
    iconTone === 'draft'  ? c.yBg :
    iconTone === 'locked' ? c.gBg :
    iconTone === 'red'    ? c.rBg :
                            c.sBg;
  // Each card grows to fill its share (`flexGrow`) but claims a healthy
  // minimum (`minWidth: 200`) so the parent row wraps into two-up or one-up
  // on narrow viewports instead of crushing three cards below the point
  // where their labels or numbers fit.
  return (
    <View style={[{
      flexGrow: 1, flexBasis: 200, minWidth: 200,
      borderWidth: 1, borderColor: c.border, borderRadius: radius.lg,
      backgroundColor: c.card, padding: 16,
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    }, style]}>
      {icon && (
        <View style={{
          width: 36, height: 36, borderRadius: radius.md,
          backgroundColor: iconBg,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <MicroLabel>{label}</MicroLabel>
        <Text style={{
          color: c.fg, fontSize: font.h1, fontWeight: weight.bold as TextStyle['fontWeight'],
          fontFamily, fontVariant: ['tabular-nums'],
          marginTop: 4,
        }}>{value}</Text>
        {hint && (
          <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, marginTop: 2 }}>
            {hint}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Field (labelled text input) ───────────────────────────────────────────

export function Field({
  label, value, onChangeText, placeholder, secureTextEntry, error, autoCapitalize, keyboardType, autoFocus, editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoFocus?: boolean;
  editable?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <MicroLabel>{label}</MicroLabel>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.mut}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        editable={editable}
        style={{
          borderWidth: 1,
          borderColor: error ? c.rTx : c.border,
          backgroundColor: c.bg,
          color: c.fg,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: font.bodyLg,
          fontFamily,
        }}
      />
      {error && <Text style={{ color: c.rTx, fontSize: font.small, fontFamily }}>{error}</Text>}
    </View>
  );
}

// ─── Banner (inline messages) ──────────────────────────────────────────────

export function Banner({
  tone, title, body, action,
}: {
  tone: 'success' | 'warning' | 'error' | 'info';
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  const { c } = useTheme();
  const cfg =
    tone === 'success' ? { tx: c.gTx, bg: c.gBg } :
    tone === 'warning' ? { tx: c.yTx, bg: c.yBg } :
    tone === 'error'   ? { tx: c.rTx, bg: c.rBg } :
                         { tx: c.mut, bg: c.accent };
  return (
    <View style={{
      backgroundColor: cfg.bg,
      borderRadius: radius.md,
      padding: 14,
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{
          color: cfg.tx, fontSize: font.bodyLg,
          fontWeight: weight.semibold as TextStyle['fontWeight'],
          fontFamily,
        }}>{title}</Text>
        {body && <Text style={{ color: c.mut, fontSize: font.body, marginTop: 4, fontFamily }}>{body}</Text>}
      </View>
      {action}
    </View>
  );
}

// ─── Screen wrapper ─────────────────────────────────────────────────────────

export function Screen({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const { isPhone } = useBreakpoint();
  // Padding tightens on phones so cards get the full viewport width instead
  // of losing 64 px to gutters on a 375 px screen. Vertical rhythm shrinks
  // too — chunky 48px paddings look luxurious on desktop but wasteful on
  // a small viewport where the user needs to scan quickly.
  return (
    <ScrollView
      style={{ backgroundColor: c.bg, flex: 1 }}
      contentContainerStyle={{ minHeight: '100%' }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 1400,
          marginHorizontal: 'auto',
          paddingHorizontal: isPhone ? 16 : 32,
          paddingTop: isPhone ? 16 : 24,
          paddingBottom: isPhone ? 32 : 48,
          gap: isPhone ? space.xl : space.xxl,
        }}
      >
        {children}
      </View>
    </ScrollView>
  );
}

// ─── PageHeader ─────────────────────────────────────────────────────────────

export function PageHeader({
  title, subtitle, action, titleBadge,
}: { title: string; subtitle?: string; action?: ReactNode; titleBadge?: ReactNode }) {
  // flexWrap on the outer row + minWidth on the title cell so a wide action
  // cluster (SI Detail has 5 CTAs) drops beneath the title instead of
  // squeezing "Connaught Place" into a character-per-line vertical column.
  // `titleBadge` renders inline alongside the title — used for a status chip
  // (Draft/Locked) so the reader sees the state at a glance without adding
  // another card to the meta strip below.
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <View style={{ flex: 1, minWidth: 240 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Body size="h1" wt="bold">{title}</Body>
          {titleBadge}
        </View>
        {subtitle && <Body mut style={{ marginTop: 6 }}>{subtitle}</Body>}
      </View>
      {action}
    </View>
  );
}

// ─── EmptyState / ErrorState / LoadingState ────────────────────────────────

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ padding: 72, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator size="small" color={c.mut} />
      <Body mut>{label}</Body>
    </View>
  );
}

export function EmptyState({
  title, body, cta,
}: { title: string; body?: string; cta?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ padding: 60, alignItems: 'center', gap: 6 }}>
      <View style={{
        width: 52, height: 52, borderRadius: 14, backgroundColor: c.muted,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
      }}>
        <IconFileEmpty size={22} color={c.mut} />
      </View>
      <Body wt="semibold" size="h4">{title}</Body>
      {body && <Body mut style={{ textAlign: 'center', maxWidth: 360 }}>{body}</Body>}
      {cta && <View style={{ marginTop: 12 }}>{cta}</View>}
    </View>
  );
}

export function ErrorState({
  title = "Couldn't load", body, onRetry,
}: { title?: string; body?: string; onRetry?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ padding: 60, alignItems: 'center', gap: 6 }}>
      <View style={{
        width: 52, height: 52, borderRadius: 14, backgroundColor: c.rBg,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
      }}>
        <IconAlert size={22} color={c.rTx} />
      </View>
      <Body wt="semibold" size="h4">{title}</Body>
      {body && <Body mut style={{ textAlign: 'center', maxWidth: 380 }}>{body}</Body>}
      {onRetry && (
        <View style={{ marginTop: 12 }}>
          <Button variant="secondary" label="Retry" onPress={onRetry} />
        </View>
      )}
    </View>
  );
}

// ─── Segment (small tab-like control — used for List's status filter) ──────

export function Segment<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: c.card,
      borderWidth: 1, borderColor: c.border, borderRadius: radius.md,
      padding: 3, gap: 2,
    }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              paddingVertical: 5, paddingHorizontal: 12, borderRadius: radius.sm,
              backgroundColor: active ? c.redSolid : 'transparent',
            }}
          >
            <Text style={{
              color: active ? '#fff' : c.mut,
              fontSize: font.body,
              fontWeight: (active ? weight.semibold : weight.medium) as TextStyle['fontWeight'],
              fontFamily,
            }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
