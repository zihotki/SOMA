import type { ReviewComment, ReviewDraft } from '../shared/review';
import { runSoma } from './build';

async function review<T>(root: string, args: string[]): Promise<T> {
  const result = await runSoma(['review', ...args], root);
  if (!result.ok) throw new Error(result.err.trim() || 'The review log could not be opened.');
  return JSON.parse(result.out) as T;
}

export function readReviewComments(root: string): Promise<ReviewComment[]> {
  return review(root, ['list']);
}

export function appendReviewComment(root: string, raw: unknown): Promise<ReviewComment> {
  const draft = raw as Partial<ReviewDraft> | null;
  if (typeof draft?.text !== 'string' || typeof draft.reference !== 'string'
    || (draft.buildId != null && typeof draft.buildId !== 'string')) {
    throw new Error('The review comment is invalid.');
  }
  const args = ['add', `--text=${draft.text}`, `--reference=${draft.reference}`];
  if (draft.buildId) args.push(`--build-id=${draft.buildId}`);
  return review(root, args);
}
