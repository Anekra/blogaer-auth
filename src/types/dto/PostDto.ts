import { CommentDto } from "./CommentDto";
import { ThoughtDto } from "./ThoughtDto";

export type PostDto = {
  id: string;
  userId?: string;
  title: string;
  text: string;
  content: any[];
  categories: string[];
  tags: string[];
  comments: CommentDto[];
  thoughts: ThoughtDto[];
  createdAt: string;
  updatedAt: string;
};
