// UI kit — every primitive the design uses, extracted into RN-friendly
// components that read from the theme context. The visual language is a
// direct port of the Claude Design output (SiListFrame.dc.html) for the
// components it drew (Chip, StatusChip, MetricCard, SectionCard, Button)
// and follows the same conventions for those it didn't (Field, Banner,
// DialogShell, MultiSelectPill).

import { type ReactNode } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, TextInput, ScrollView,
  type ViewStyle, type TextStyle, type StyleProp,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, space, weight, fontFamily } from '../theme/tokens';

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
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  leading?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
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
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ hovered, pressed }) => ([
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 9,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          opacity: disabled ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        } as ViewStyle,
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
}

// ─── Chip / StatusChip ─────────────────────────────────────────────────────

export type StatusTone = 'draft' | 'locked' | 'error' | 'neutral';

export function StatusChip({ tone, label }: { tone: StatusTone; label?: string }) {
  const { c } = useTheme();
  const cfg =
    tone === 'draft'  ? { tx: c.yTx, bg: c.yBg, dot: c.yDot, dflt: 'Draft' } :
    tone === 'locked' ? { tx: c.gTx, bg: c.gBg, dot: c.gDot, dflt: 'Locked' } :
    tone === 'error'  ? { tx: c.rTx, bg: c.rBg, dot: c.rDot, dflt: 'Error' } :
                        { tx: c.sTx, bg: c.sBg, dot: c.mut,  dflt: '—' };
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
  return (
    <Card style={style}>
      <View style={{ padding: 18, paddingBottom: 14, flexDirection: 'row', gap: 16, justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
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
  label, value, valueSuffix, style, tone,
}: {
  label: string;
  value: string | number;
  valueSuffix?: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: StatusTone;
}) {
  const { c } = useTheme();
  return (
    <View style={[{
      flex: 1, minWidth: 0,
      borderWidth: 1, borderColor: c.border, borderRadius: radius.lg,
      backgroundColor: c.card, padding: 16,
    }, style]}>
      <MicroLabel>{label}</MicroLabel>
      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text style={{
          color: c.fg, fontSize: font.h1, fontWeight: weight.bold as TextStyle['fontWeight'],
          fontFamily, fontVariant: ['tabular-nums'],
        }}>{value}</Text>
        {tone && <StatusChip tone={tone} />}
        {valueSuffix}
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
  return (
    <ScrollView style={{ backgroundColor: c.bg, flex: 1 }} contentContainerStyle={{
      maxWidth: 1400,
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: 32,
      paddingTop: 24,
      paddingBottom: 48,
      gap: space.xxl,
    }}>
      {children}
    </ScrollView>
  );
}

// ─── PageHeader ─────────────────────────────────────────────────────────────

export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
      <View style={{ flex: 1 }}>
        <Body size="h1" wt="bold">{title}</Body>
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
        <Text style={{ color: c.mut, fontSize: 22 }}>◻︎</Text>
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
        <Text style={{ color: c.rTx, fontSize: 24, fontWeight: 'bold' }}>!</Text>
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
