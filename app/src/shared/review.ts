export interface ReviewDraft {
  text: string;
  reference: string;
  buildId: string | null;
}

export interface ReviewComment extends ReviewDraft {
  id: string;
  stale?: boolean;
}

export interface ReviewApi {
  list(projectId: string): Promise<ReviewComment[]>;
  add(projectId: string, draft: ReviewDraft): Promise<ReviewComment>;
}
