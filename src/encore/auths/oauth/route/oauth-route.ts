import { api } from 'encore.dev/api';
import oauthController from '../controller/oauth-controller';

export const google = api.raw(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/google',
    expose: true,
    tags: ['verify-oauth-code', 'main-model', 'init-rpc-chan']
  },
  oauthController.google
);

export const github = api.raw(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/github',
    expose: true,
    tags: ['verify-oauth-code', 'main-model', 'init-rpc-chan']
  },
  oauthController.github
);
