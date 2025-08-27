import { api } from 'encore.dev/api';
import userController from '../../controllers/user-controller';

export const getSocials = api(
  {
    method: 'GET',
    path: '/auth-service/v1/user/social',
    auth: true,
    expose: true,
    tags: ['main-model']
  },
  userController.getSocial
);

export const patchSocial = api(
  {
    method: 'PATCH',
    path: '/auth-service/v1/user/social',
    auth: true,
    expose: true,
    tags: ['main-model']
  },
  userController.patchSocial
);
