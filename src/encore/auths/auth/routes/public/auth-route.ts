import { api } from 'encore.dev/api';
import authController from '../../controllers/auth-controller';
import { RegisterReq } from '../../../../../types/request';
import { DefaultRes } from '../../../../../types';

export const register = api<RegisterReq, Promise<DefaultRes>>(
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

export const verifyEmail = api.raw(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/verify-email',
    expose: true,
    tags: ['main-model']
  },
  authController.verifyEmail
);
