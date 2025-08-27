import { api } from 'encore.dev/api';
import userController from '../../controllers/user-controller';

export const getSecurity = api(
  {
    method: 'GET',
    path: '/auth-service/v1/user/security',
    auth: true,
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  userController.getSecurity
);

export const addOrResetPassword = api(
  {
    method: 'POST',
    path: '/auth-service/v1/user/security/add-or-reset-password',
    auth: true,
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  userController.addOrResetPassword
);
