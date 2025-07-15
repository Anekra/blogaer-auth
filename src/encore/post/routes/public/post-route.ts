import { api } from 'encore.dev/api';
import postController from '../../controller/post-controller';

export const getPostsByPage = api.raw(
  {
    method: 'GET',
    path: '/auth-service/v1/post/public',
    expose: true,
    tags: ['init-rpc-chan']
  },
  postController.getPostsByPage
);

export const getPostById = api.raw(
  {
    method: 'GET',
    path: '/auth-service/v1/post/public/:id',
    expose: true,
    tags: ['init-rpc-chan']
  },
  postController.getPostById
);
