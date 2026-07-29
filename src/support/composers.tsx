// Reply + Comment composers, ported 1:1 from the Franchisee Support.
// Web-only surfaces because the SI Portal ships to web first — the
// RichTextEditor is a real WYSIWYG contentEditable, so bold text LOOKS bold
// (never as raw `**markers**` visible to the user).
//
// Contracts:
//   ReplyComposer  — CCs field + RichTextEditor + Attach + Send/Save Draft/Cancel.
//                    Replying reopens a closed ticket (Zoho parity — the parent
//                    calls onSend which then patches status).
//   CommentComposer — yellow warning strip + plain textarea + Attach +
//                    Add Comment/Cancel. Comments never reopen.

import { createElement, useEffect, useRef, useState } from 'react';
import { View, Pressable, TextInput, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius, weight, font } from '../theme/tokens';
import { Button } from '../components/ui';
import {
  IconSend, IconClose, IconPaperclip, IconAlert,
  IconBold, IconItalic, IconUnderline, IconList,
  IconExternalLink, IconImage, IconMessageSquare,
} from '../components/icons';
import type { Reply, UserTicket } from './model';
import { avatarBg as avatarBgOf, fmtAbs } from './model';

// ─── ReplyComposer ────────────────────────────────────────────────────

export function ReplyComposer({
  ticket, onCancel, onSend,
}: {
  ticket: UserTicket;
  onCancel: () => void;
  onSend: (r: Reply) => void;
}) {
  const { c } = useTheme();
  const [cc, setCc] = useState<string[]>(ticket.secondaryContacts);
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  const canSend = plainText(body).trim().length > 0;

  const send = () => {
    if (!canSend) return;
    const now = new Date();
    onSend({
      from: 'You',
      channel: 'Web',
      whenAbs: fmtAbs(now),
      whenRel: 'just now',
      text: plainText(body).trim(),
      attachments: attachments.length ? attachments : undefined,
    });
  };

  return (
    <View style={{
      padding: 14,
      backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
      gap: 10,
    }}>
      {/* CCs */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <Text style={{ color: c.mut, fontSize: 12, fontFamily, paddingTop: 6, width: 36 }}>CCs :</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <CCField value={cc} onChange={setCc} />
        </View>
      </View>

      <RichTextEditor
        value={body}
        onChange={setBody}
        placeholder="Type your reply…"
        minRows={5}
      />

      <AttachField value={attachments} onChange={setAttachments} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Button
          label="Send"
          variant="primary"
          disabled={!canSend}
          leading={<IconSend size={13} color="#fff" />}
          onPress={send}
        />
        <Button label="Save Draft" variant="secondary" onPress={onCancel} />
        <Button label="Cancel" variant="ghost" onPress={onCancel} />
      </View>
    </View>
  );
}

// ─── CommentComposer ──────────────────────────────────────────────────

export function CommentComposer({
  onCancel, onSend,
}: {
  onCancel: () => void;
  onSend: (r: Reply) => void;
}) {
  const { c } = useTheme();
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  const canSend = body.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    const now = new Date();
    onSend({
      from: 'You',
      channel: 'Web',
      whenAbs: fmtAbs(now),
      whenRel: 'just now',
      text: body.trim(),
      attachments: attachments.length ? attachments : undefined,
    });
  };

  return (
    <View style={{
      padding: 14,
      backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
      gap: 10,
    }}>
      {/* Yellow warning strip — comments never reopen a closed ticket */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 6,
        backgroundColor: c.yBg, borderColor: c.yTx, borderWidth: 1, borderRadius: radius.sm,
      }}>
        <IconAlert size={12} color={c.yTx} />
        <Text style={{ color: c.yTx, fontSize: 11, fontFamily, lineHeight: 16 }}>
          Comment — internal to the thread. Does not reopen a closed ticket.
        </Text>
      </View>

      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Add Comment"
        placeholderTextColor={c.mut}
        multiline
        style={{
          minHeight: 96,
          padding: 12,
          color: c.fg, fontSize: 14, fontFamily,
          backgroundColor: c.bg,
          borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
          textAlignVertical: 'top',
        } as any}
      />

      <AttachField value={attachments} onChange={setAttachments} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Button
          label="Add Comment"
          variant="secondary"
          disabled={!canSend}
          leading={<IconMessageSquare size={13} color={c.yTx} />}
          onPress={send}
        />
        <Button label="Cancel" variant="ghost" onPress={onCancel} />
      </View>
    </View>
  );
}

// ─── RichTextEditor ───────────────────────────────────────────────────
// WYSIWYG via a contentEditable <div>. Bold/italic/underline via
// document.execCommand — deprecated-but-supported everywhere, matches
// Franchisee Support 1:1. On non-web platforms this falls back to a
// plain multiline TextInput.

function RichTextEditor({
  value, onChange, placeholder, minRows = 4, maxLength,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; minRows?: number; maxLength?: number;
}) {
  const { c } = useTheme();

  // Native fallback — RN doesn't have contentEditable; a multiline TextInput
  // preserves the collect-then-serialize semantics without the formatting.
  if (Platform.OS !== 'web') {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.mut}
        multiline
        style={{
          minHeight: minRows * 20,
          padding: 12,
          color: c.fg, fontSize: 14, fontFamily,
          backgroundColor: c.bg,
          borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
          textAlignVertical: 'top',
        } as any}
      />
    );
  }

  return <RichTextEditorWeb value={value} onChange={onChange} placeholder={placeholder} minRows={minRows} maxLength={maxLength} />;
}

function RichTextEditorWeb({
  value, onChange, placeholder, minRows = 4, maxLength,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; minRows?: number; maxLength?: number;
}) {
  const { c } = useTheme();
  const editorRef = useRef<any>(null);
  const [textLen, setTextLen] = useState(0);
  const [empty, setEmpty] = useState(true);

  // Sync external value → editor DOM (only when the DOM doesn't already
  // reflect it, so we don't wipe the cursor on every keystroke).
  useEffect(() => {
    const el = editorRef.current as unknown as HTMLDivElement | null;
    if (!el) return;
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
    setTextLen(el.innerText.length);
    setEmpty(el.innerText.trim().length === 0);
  }, [value]);

  const sync = () => {
    const el = editorRef.current as unknown as HTMLDivElement | null;
    if (!el) return;
    const html = el.innerHTML;
    const text = el.innerText;
    setTextLen(text.length);
    setEmpty(text.trim().length === 0);
    onChange(html);
  };

  const exec = (cmd: string, arg?: string) => {
    const el = editorRef.current as unknown as HTMLDivElement | null;
    el?.focus();
    // execCommand is deprecated-but-universally-supported; Franchisee Support
    // uses the same call. When browsers drop it, swap for the Selection API.
    (document as any).execCommand(cmd, false, arg);
    sync();
  };
  const insertLink = () => {
    const url = window.prompt('Link URL', 'https://');
    if (!url) return;
    exec('createLink', url);
  };
  const insertImage = () => {
    const url = window.prompt('Image URL', 'https://');
    if (!url) return;
    exec('insertImage', url);
  };

  const onPaste = (e: any) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    (document as any).execCommand('insertText', false, text);
  };

  const onBeforeInput = (e: any) => {
    if (!maxLength) return;
    const inputType = e.inputType as string | undefined;
    if (inputType?.startsWith('delete')) return;
    if (textLen >= maxLength) e.preventDefault();
  };

  return (
    <View style={{
      borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
      backgroundColor: c.bg, overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <View style={{
        flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 2,
        paddingHorizontal: 8, paddingVertical: 6,
        borderBottomColor: c.border, borderBottomWidth: 1,
        backgroundColor: c.footerBg,
      }}>
        <ToolbarBtn label="Bold (Ctrl+B)" onPress={() => exec('bold')}>
          <IconBold size={13} color={c.mut} />
        </ToolbarBtn>
        <ToolbarBtn label="Italic (Ctrl+I)" onPress={() => exec('italic')}>
          <IconItalic size={13} color={c.mut} />
        </ToolbarBtn>
        <ToolbarBtn label="Underline (Ctrl+U)" onPress={() => exec('underline')}>
          <IconUnderline size={13} color={c.mut} />
        </ToolbarBtn>
        <Divider />
        <ToolbarBtn label="Bulleted list" onPress={() => exec('insertUnorderedList')}>
          <IconList size={13} color={c.mut} />
        </ToolbarBtn>
        <ToolbarBtn label="Numbered list" onPress={() => exec('insertOrderedList')}>
          <Text style={{ color: c.mut, fontSize: 10, fontFamily, fontWeight: weight.semibold as TextStyle['fontWeight'] }}>1.</Text>
        </ToolbarBtn>
        <Divider />
        <ToolbarBtn label="Insert link" onPress={insertLink}>
          <IconExternalLink size={13} color={c.mut} />
        </ToolbarBtn>
        <ToolbarBtn label="Insert image" onPress={insertImage}>
          <IconImage size={13} color={c.mut} />
        </ToolbarBtn>
        <Divider />
        <ToolbarBtn label="Clear formatting" onPress={() => exec('removeFormat')}>
          <Text style={{ color: c.mut, fontSize: 10, fontFamily, fontWeight: weight.semibold as TextStyle['fontWeight'] }}>Tx</Text>
        </ToolbarBtn>
      </View>

      {/* Editable area */}
      <View style={{ position: 'relative' }}>
        {createElement('div', {
          ref: editorRef,
          contentEditable: true,
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': placeholder,
          onInput: sync,
          onPaste,
          onBeforeInput,
          suppressContentEditableWarning: true,
          style: {
            outline: 'none',
            padding: '10px 12px',
            fontSize: 14,
            fontFamily,
            color: c.fg,
            lineHeight: 1.6,
            minHeight: `${minRows * 1.5}em`,
            width: '100%',
          },
        })}
        {empty && !!placeholder && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 10, left: 12 } as ViewStyle}>
            <Text style={{ color: c.mut, fontSize: 14, fontFamily }}>{placeholder}</Text>
          </View>
        )}
      </View>

      {/* Footer strip */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        paddingHorizontal: 12, paddingVertical: 6,
        borderTopColor: c.border, borderTopWidth: 1,
        backgroundColor: c.footerBg,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Kbd label="⌘B" />
          <Kbd label="⌘I" />
          <Kbd label="⌘U" />
          <Text style={{ color: c.mut, fontSize: 11, fontFamily, marginLeft: 4 }}>for bold, italic, underline</Text>
        </View>
        {maxLength && (
          <Text style={{
            color: textLen >= maxLength ? c.rTx : textLen / maxLength >= 0.85 ? c.yTx : c.mut,
            fontSize: 11, fontFamily, fontVariant: ['tabular-nums'],
            fontWeight: textLen >= maxLength ? (weight.semibold as TextStyle['fontWeight']) : (weight.regular as TextStyle['fontWeight']),
          }}>
            {textLen} / {maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}

function ToolbarBtn({ label, onPress, children }: {
  label: string; onPress: () => void; children: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ hovered }) => ({
        minWidth: 26, height: 26,
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 4,
        borderRadius: radius.sm,
        backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
      } as ViewStyle)}
    >
      {children}
    </Pressable>
  );
}

function Divider() {
  const { c } = useTheme();
  return <View style={{ width: 1, height: 14, backgroundColor: c.border, marginHorizontal: 4 }} />;
}

function Kbd({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{
      paddingHorizontal: 4, paddingVertical: 1,
      backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 3,
    }}>
      <Text style={{ color: c.mut, fontSize: 10, fontFamily }}>{label}</Text>
    </View>
  );
}

// ─── CCField ──────────────────────────────────────────────────────────

export function CCField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { c } = useTheme();
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  return (
    <View style={{
      flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6,
      padding: 6,
      backgroundColor: c.bg,
      borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
    }}>
      {value.map((cc) => (
        <View key={cc} style={{
          flexDirection: 'row', alignItems: 'center', gap: 4,
          paddingHorizontal: 6, paddingVertical: 2,
          backgroundColor: c.muted, borderColor: c.border, borderWidth: 1, borderRadius: 4,
        }}>
          <View style={{
            width: 16, height: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
            backgroundColor: avatarBgOf(cc),
          }}>
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: weight.bold as TextStyle['fontWeight'], fontFamily }}>
              {cc.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={{ color: c.fg, fontSize: 12, fontFamily }}>{cc}</Text>
          <Pressable
            onPress={() => onChange(value.filter((x) => x !== cc))}
            accessibilityLabel={`Remove ${cc}`}
            style={{ padding: 2 }}
          >
            <IconClose size={10} color={c.mut} />
          </Pressable>
        </View>
      ))}
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={add}
        onBlur={add}
        placeholder={value.length === 0 ? 'Enter name or email address' : ''}
        placeholderTextColor={c.mut}
        style={{
          flex: 1, minWidth: 140,
          paddingHorizontal: 6, paddingVertical: 4,
          color: c.fg, fontSize: 14, fontFamily,
          backgroundColor: 'transparent',
        } as any}
      />
    </View>
  );
}

// ─── AttachField ──────────────────────────────────────────────────────

export function AttachField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { c } = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={() => onChange([...value, `mock-file-${value.length + 1}.png`])}
          accessibilityLabel="Attach a file"
          style={({ hovered }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 12, paddingVertical: 8,
            borderColor: c.border, borderWidth: 1, borderRadius: radius.sm,
            backgroundColor: (hovered as boolean) ? c.accent : c.card,
          } as ViewStyle)}
        >
          <IconPaperclip size={13} color={c.fg} />
          <Text style={{ color: c.fg, fontSize: 12, fontFamily }}>Attach a file</Text>
        </Pressable>
        <Text style={{ color: c.mut, fontSize: 11, fontFamily }}>(Up to 40 MB)</Text>
      </View>
      {value.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {value.map((f) => (
            <View key={f} style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 8, paddingVertical: 2,
              backgroundColor: c.muted, borderColor: c.border, borderWidth: 1, borderRadius: 4,
            }}>
              <IconPaperclip size={10} color={c.mut} />
              <Text style={{ color: c.fg, fontSize: 12, fontFamily }}>{f}</Text>
              <Pressable
                onPress={() => onChange(value.filter((x) => x !== f))}
                accessibilityLabel={`Remove ${f}`}
                style={{ padding: 2 }}
              >
                <IconClose size={10} color={c.mut} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── util: HTML → plain text (kept simple; we serialise for the mock
// backend, and the thread renders text-only).
function plainText(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '');
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.innerText;
}
