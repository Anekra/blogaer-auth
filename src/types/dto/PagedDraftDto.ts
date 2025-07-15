import { DraftDto } from './DraftDto';

export type PagedDraftDto = {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  drafts: DraftDto[];
};
