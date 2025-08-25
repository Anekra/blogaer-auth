import { api } from 'encore.dev/api';
import draftController from '../../controller/draft-controller';

export const getDraftsByUserId = api.raw(
  {
    method: 'GET',
    path: '/auth-service/v1/draft/user',
    auth: true,
    expose: true,
    tags: [
      'verify-refresh-token',
      'verify-access-token',
      'init-rpc-chan',
      'verify-author'
    ]
  },
  draftController.getDraftsByUserId
);

export const getDraftById = api.raw(
  {
    method: 'GET',
    path: '/auth-service/v1/draft/:id',
    auth: true,
    expose: true,
    tags: [
      'verify-refresh-token',
      'verify-access-token',
      'init-rpc-chan',
      'verify-author'
    ]
  },
  draftController.getDraftById
);

export const addDraft = api.raw(
  {
    method: 'POST',
    path: '/auth-service/v1/draft',
    auth: true,
    expose: true,
    tags: [
      'verify-refresh-token',
      'verify-access-token',
      'init-rpc-chan',
      'verify-author'
    ]
  },
  draftController.addDraft
);

export const patchDraft = api.raw(
  {
    method: 'PATCH',
    path: '/auth-service/v1/draft',
    auth: true,
    expose: true,
    tags: [
      'verify-refresh-token',
      'verify-access-token',
      'init-topic-chan',
      'verify-author'
    ]
  },
  draftController.patchDraft
);

export const deleteDraft = api.raw(
  {
    method: 'DELETE',
    path: '/auth-service/v1/draft/:id',
    auth: true,
    expose: true,
    tags: [
      'verify-refresh-token',
      'verify-access-token',
      'init-topic-chan',
      'verify-author'
    ]
  },
  draftController.deleteDraft
);
