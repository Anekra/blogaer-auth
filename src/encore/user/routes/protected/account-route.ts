import { api } from 'encore.dev/api';
import userController from '../../controllers/user-controller';

export const getAccount = api(
  {
    method: 'GET',
    path: '/auth-service/v1/user/account',
    auth: false, // will change to true later
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  userController.getAccount
);

export const patchAccount = api(
  {
    method: 'PATCH',
    path: '/auth-service/v1/user/account',
    auth: false, // will change to true later
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  userController.patchAccount
);

export const patchAccountEmail = api(
  {
    method: 'PATCH',
    path: '/auth-service/v1/user/account/update-email',
    auth: false, // will change to true later
    expose: true,
    tags: [
      'verify-refresh-token',
      'verify-access-token',
      'verify-request-form-otp',
      'main-model'
    ]
  },
  userController.patchAccount
);

export const patchAccountUsername = api(
  {
    method: 'PATCH',
    path: '/auth-service/v1/user/account/update-username',
    auth: false, // will change to true later
    expose: true,
    tags: [
      'verify-refresh-token',
      'verify-access-token',
      'verify-request-form',
      'main-model'
    ]
  },
  userController.patchAccount
);
