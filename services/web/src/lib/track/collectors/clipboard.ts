/**
 * Clipboard interactions — copy / cut / paste.
 *
 * Records the byte length and target tag so the rollup worker can build a
 * "research / saving / planning" behavioural signal. We deliberately do NOT
 * capture the clipboard contents — only sizes and the originating element
 * type (e.g. `IMG`, `INPUT`, `BUTTON`, `DIV`).
 */

type Emit = (event: { e: string; p?: Record<string, unknown> }) => void;

const MAX_LEN = 10_000; // cap to avoid pathological selections

function tagOf(target: EventTarget | null): string {
  if (!target || !(target as HTMLElement).tagName) return 'UNK';
  return (target as HTMLElement).tagName;
}

export function installClipboard(emit: Emit): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onCopy = (e: ClipboardEvent): void => {
    const text = e.clipboardData?.getData('text') ?? window.getSelection()?.toString() ?? '';
    emit({ e: 'clipboard.copy', p: { len: Math.min(text.length, MAX_LEN), tag: tagOf(e.target) } });
  };
  const onCut = (e: ClipboardEvent): void => {
    const text = e.clipboardData?.getData('text') ?? window.getSelection()?.toString() ?? '';
    emit({ e: 'clipboard.cut', p: { len: Math.min(text.length, MAX_LEN), tag: tagOf(e.target) } });
  };
  const onPaste = (e: ClipboardEvent): void => {
    const text = e.clipboardData?.getData('text') ?? '';
    emit({ e: 'clipboard.paste', p: { len: Math.min(text.length, MAX_LEN), tag: tagOf(e.target) } });
  };
  const onSelect = (): void => {
    const sel = window.getSelection();
    const len = sel?.toString().length ?? 0;
    if (len > 5) emit({ e: 'selection.range', p: { len: Math.min(len, MAX_LEN) } });
  };

  document.addEventListener('copy', onCopy);
  document.addEventListener('cut', onCut);
  document.addEventListener('paste', onPaste);
  // selectionchange fires on every keystroke during selection — debounce.
  let selTimer: ReturnType<typeof setTimeout> | null = null;
  const onSelChange = (): void => {
    if (selTimer) clearTimeout(selTimer);
    selTimer = setTimeout(onSelect, 600);
  };
  document.addEventListener('selectionchange', onSelChange);

  return () => {
    document.removeEventListener('copy', onCopy);
    document.removeEventListener('cut', onCut);
    document.removeEventListener('paste', onPaste);
    document.removeEventListener('selectionchange', onSelChange);
  };
}
