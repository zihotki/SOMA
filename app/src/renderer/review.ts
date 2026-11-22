import type { ReviewApi } from '../shared/review';
import { el } from './ui';

export class ReviewPanel {
  private dialog: HTMLDialogElement | null = null;

  constructor(
    private readonly api: ReviewApi,
    private readonly toast: (message: string, kind?: 'ok' | 'info' | 'error') => void,
  ) {}

  close(): void { this.dialog?.close(); }

  private open(title: string) {
    this.close();
    const body = el('div', { className: 'ask-dlg' }, el('h2', { className: 'ask-msg' }, title));
    const dialog = el('dialog', { className: 'review-dialog', ariaLabel: title }, body);
    dialog.addEventListener('keydown', (event) => event.stopPropagation());
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (this.dialog === dialog) this.dialog = null;
    });
    this.dialog = dialog;
    document.body.append(dialog);
    return { dialog, body };
  }

  add(projectId: string, reference: string, buildId: string | null): void {
    const { dialog, body } = this.open('Add comment');
    const input = el('textarea', { rows: 4, maxLength: 8000, required: true, ariaLabel: 'Comment' });
    const error = el('div', { className: 'ask-detail', role: 'alert' });
    const cancel = el('button', { className: 'btn', type: 'button' }, 'Cancel');
    const save = el('button', { className: 'btn primary', type: 'submit' }, 'Save comment');
    cancel.addEventListener('click', () => dialog.close());
    const form = el('form', {}, el('p', { className: 'ask-detail' }, reference.trim()), input, error,
      el('div', { className: 'ask-btns' }, cancel, save));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text || save.disabled) return;
      save.disabled = true;
      try {
        await this.api.add(projectId, { text, reference, buildId });
        dialog.close();
        this.toast('Comment saved.');
      } catch (failure) {
        error.textContent = failure instanceof Error ? failure.message : String(failure);
        save.disabled = false;
      }
    });
    body.append(form);
    dialog.showModal();
    input.focus();
  }

  async show(projectId: string): Promise<void> {
    const { dialog, body } = this.open('Review comments');
    const notes = el('ol', { className: 'ask-detail review-comments' });
    const status = el('p', { className: 'ask-detail' }, 'Loading…');
    const done = el('button', { className: 'btn' }, 'Close');
    done.addEventListener('click', () => dialog.close());
    body.append(status, notes, el('div', { className: 'ask-btns' }, done));
    dialog.showModal();
    try {
      const comments = await this.api.list(projectId);
      status.textContent = comments.length ? '' : 'No pending comments.';
      for (const comment of comments) {
        notes.append(el('li', {}, el('b', {}, comment.text),
          el('div', {}, comment.reference.trim()),
          comment.stale ? el('div', {}, 'Check against the current build') : null));
      }
    } catch (failure) {
      status.textContent = failure instanceof Error ? failure.message : String(failure);
    }
  }
}
