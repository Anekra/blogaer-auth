import { api } from 'encore.dev/api';
import { UsernameReq } from '../../../../../types/request';
import authAppController from '../../controllers/authapp-controller';
import webauthnController from '../../controllers/webauthn-controller';

export const generateRegisterWebauthn = api(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/two-fa/webauthn/register/generate',
    auth: false, // will change it to true later
    expose: true,
    tags: [
      'verify-refresh-token',
      'verify-access-token',
      'main-model',
      'in-memory-model'
    ]
  },
  webauthnController.generateRegisterWebauthn
);

export const verifyRegisterWebauthn = api(
  {
    method: 'POST',
    path: '/auth-service/v1/auth/two-fa/webauthn/register/verify',
    auth: false, // will change it to true later
    expose: true,
    tags: [
      'verify-refresh-token',
      'verify-access-token',
      'main-model',
      'in-memory-model'
    ]
  },
  webauthnController.verifyRegisterWebauthn
);

export const deleteWebauthnPasskey = api(
  {
    method: 'DELETE',
    path: '/auth-service/v1/auth/two-fa/webauthn/passkey',
    auth: false, // will change it to true later
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  webauthnController.deleteWebauthnPasskey
);

export const registerAuthApp = api(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/two-fa/authapp/register',
    auth: false, // will change it to true later
    expose: true,
    tags: [
      'verify-refresh-token',
      'verify-access-token',
      'main-model',
      'in-memory-model'
    ]
  },
  authAppController.registerAuthApp
);

export const verifyAuthApp = api(
  {
    method: 'POST',
    path: '/auth-service/v1/auth/two-fa/authapp/verify',
    auth: false, // will change it to true later
    expose: true,
    tags: [
      'verify-refresh-token',
      'verify-access-token',
      'main-model',
      'in-memory-model'
    ]
  },
  authAppController.verifyAuthApp
);

export const getAuthAppToken = api<UsernameReq>(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/two-fa/authapp/:username',
    auth: false, // will change it to true later
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  authAppController.getAuthAppToken
);

export const deleteAuthAppSecret = api(
  {
    method: 'DELETE',
    path: '/auth-service/v1/auth/two-fa/authapp',
    auth: false, // will change it to true later
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  authAppController.deleteAuthAppSecret
);
