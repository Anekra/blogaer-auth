import { api } from 'encore.dev/api';
import authController from '../../controllers/auth-controller';

export const refreshToken = api(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/refresh',
    expose: true,
    tags: ['verify-refresh-token', 'main-model']
  },
  authController.refreshToken
);

export const logout = api(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/logout',
    expose: true,
    tags: ['verify-refresh-token', 'main-model']
  },
  authController.logout
);

export const checkUsername = api(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/check-username',
    expose: true,
    tags: ['verify-refresh-token', 'main-model']
  },
  authController.checkUsername
);
