/**
 * Form interaction collector.
 *
 * Emits `form.focus` / `form.change` / `form.submit` / `form.error`. We never
 * capture field values — only field names (sanitized) and edit counts.
 * Fields named like `password|pass|otp|cvv|ssn|card` are completely ignored.
 */

type Emit = (event: { e: string; p?: Record<string, unknown>; tid?: string }) => void;

const FORBID = /(password|pass(word)?|otp|cvv|ssn|card|secret|token)/i;

function fieldName(el: Element | null): string {
  if (!el) return 'anon';
  const e = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  return (e.name || e.id || el.tagName || 'anon').slice(0, 48);
}

function formId(form: HTMLFormElement | null): string {
  if (!form) return 'anon';
  return (form.id || form.getAttribute('name') || form.action || 'anon').slice(0, 64);
}

export function installForms(emit: Emit): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const editCounts = new WeakMap<Element, number>();

  const onFocusIn = (ev: FocusEvent): void => {
    const t = ev.target as HTMLElement | null;
    if (!t || !(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement)) return;
    const name = fieldName(t);
    if (FORBID.test(name)) return;
    emit({ e: 'form.focus', p: { field: name, form: formId(t.form) } });
  };

  const onInput = (ev: Event): void => {
    const t = ev.target as HTMLElement | null;
    if (!t) return;
    if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement)) return;
    const name = fieldName(t);
    if (FORBID.test(name)) return;
    const n = (editCounts.get(t) || 0) + 1;
    editCounts.set(t, n);
    // Sample every 8th edit to avoid event spam on long fields.
    if (n === 1 || n % 8 === 0) {
      emit({ e: 'form.change', p: { field: name, form: formId(t.form), edits: n } });
    }
  };

  const onSubmit = (ev: SubmitEvent): void => {
    const form = ev.target as HTMLFormElement | null;
    emit({ e: 'form.submit', p: { form: formId(form) } });
  };

  document.addEventListener('focusin', onFocusIn, { passive: true, capture: true });
  document.addEventListener('input', onInput, { passive: true, capture: true });
  document.addEventListener('submit', onSubmit, { passive: true, capture: true });

  return () => {
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('input', onInput, true);
    document.removeEventListener('submit', onSubmit, true);
  };
}
