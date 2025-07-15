import { api } from 'encore.dev/api';
import postController from '../../controller/post-controller';

export const getPostsByUserId = api.raw(
  {
    method: 'GET',
    path: '/auth-service/v1/post/user',
    auth: false, // will change it to true later
    expose: true,
    tags: [
      'main-model',
      'verify-refresh-token',
      'verify-access-token',
      'init-rpc-chan',
      'verify-author'
    ]
  },
  postController.getPostsByUserId
);

export const addPost = api.raw(
  {
    method: 'POST',
    path: '/auth-service/v1/post',
    auth: false, // will change it to true later
    expose: true,
    tags: [
      'main-model',
      'verify-refresh-token',
      'verify-access-token',
      'init-rpc-chan',
      'verify-author'
    ]
  },
  postController.addPost
);

export const patchPost = api.raw(
  {
    method: 'PATCH',
    path: '/auth-service/v1/post',
    auth: false, // will change it to true later
    expose: true,
    tags: [
      'main-model',
      'verify-refresh-token',
      'verify-access-token',
      'init-topic-chan',
      'verify-author'
    ]
  },
  postController.patchPost
);

export const deletePost = api.raw(
  {
    method: 'DELETE',
    path: '/auth-service/v1/post/:id',
    auth: false, // will change it to true later
    expose: true,
    tags: [
      'main-model',
      'verify-refresh-token',
      'verify-access-token',
      'init-topic-chan',
      'verify-author'
    ]
  },
  postController.deletePost
);
