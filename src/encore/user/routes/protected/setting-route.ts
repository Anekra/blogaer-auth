import { api } from 'encore.dev/api';
import userController from '../../controllers/user-controller';

export const patchSetting = api(
  {
    method: 'PATCH',
    path: '/auth-service/v1/user/setting',
    auth: true,
    expose: true,
    tags: ['verify-refresh-token', 'verify-access-token', 'main-model']
  },
  userController.patchSetting
);
