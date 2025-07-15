import { api } from 'encore.dev/api';
import authController from '../../controllers/auth-controller';

export const register = api(
  {
    method: 'POST',
    path: '/auth-service/v1/auth/register',
    expose: true,
    tags: ['main-model']
  },
  authController.register
);

export const login = api(
  {
    method: 'POST',
    path: '/auth-service/v1/auth/login',
    expose: true,
    tags: ['main-model']
  },
  authController.login
);
