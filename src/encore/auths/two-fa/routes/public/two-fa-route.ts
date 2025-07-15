import { api } from 'encore.dev/api';
import authAppController from '../../controllers/authapp-controller';
import webauthnController from '../../controllers/webauthn-controller';
import { EmailOrUsernameReq } from '../../../../../types/request';
import twoFaController from '../../controllers/two-fa-controller';

export const getTwoFAStatus = api<EmailOrUsernameReq>(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/check-two-fa/:emailOrUsername',
    expose: true,
    tags: ['main-model']
  },
  twoFaController.getTwoFAStatus
);

export const webauthnGenerateLogin = api(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/two-fa/webauthn/login/generate',
    expose: true,
    tags: ['main-model', 'in-memory-model']
  },
  webauthnController.generateWebauthnLogin
);

export const webauthnVerifyLogin = api(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/two-fa/webauthn/login/verify',
    expose: true,
    tags: ['main-model', 'in-memory-model']
  },
  webauthnController.verifyWebauthnLogin
);

export const webauthnLogin = api(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/two-fa/webauthn/login',
    expose: true,
    tags: ['main-model', 'in-memory-model']
  },
  webauthnController.webauthnLogin
);

export const authAppLogin = api(
  {
    method: 'GET',
    path: '/auth-service/v1/auth/two-fa/authapp/login',
    expose: true,
    tags: ['main-model']
  },
  authAppController.authAppLogin
);
