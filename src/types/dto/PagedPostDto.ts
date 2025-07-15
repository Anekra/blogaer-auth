import { PostDto } from './PostDto';

export type PagedPostDto = {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  posts: PostDto[];
};
