import { api } from 'encore.dev/api';
import emailController from '../../controller/email-controller';

export const sendAddPasswordLink = api(
  {
    method: 'GET',
    path: '/auth-service/v1/email/user/add-password',
    auth: false, // will change it to true later
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  emailController.sendAddPasswordLink
);

export const sendResetPasswordLink = api(
  {
    method: 'GET',
    path: '/auth-service/v1/email/user/reset-password',
    auth: false, // will change it to true later
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  emailController.sendResetPasswordLink
);

export const sendUpdateEmailLink = api(
  {
    method: 'GET',
    path: '/auth-service/v1/email/user/update-email',
    auth: false, // will change it to true later
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  emailController.sendUpdateEmailLink
);

export const sendUpdateUsernameLink = api(
  {
    method: 'GET',
    path: '/auth-service/v1/email/user/update-username',
    auth: false, // will change it to true later
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  emailController.sendUpdateUsernameLink
);

export const sendUpdateEmailOtp = api(
  {
    method: 'POST',
    path: '/auth-service/v1/email/user/update-email-otp',
    auth: false, // will change it to true later
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  emailController.sendUpdateEmailOtp
);

export const getUpdateEmailOtpTime = api(
  {
    method: 'GET',
    path: '/auth-service/v1/email/user/update-email/otp-time',
    auth: false, // will change it to true later
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  emailController.getUpdateEmailOtpTime
);
