import { api } from 'encore.dev/api';
import type { RefreshTokenReq, XAuthReq } from '../../../../../types/request';
import type { DefaultRes } from '../../../../../types/response';
import authController from '../../controllers/auth-controller';

export const refreshToken = api<RefreshTokenReq, Promise<DefaultRes>>(
	{
		method: 'POST',
		path: '/auth-service/v1/auth/refresh',
		expose: true,
		tags: ['main-model']
	},
	authController.refreshToken
);

export const logout = api<XAuthReq, Promise<DefaultRes>>(
	{
		method: 'POST',
		path: '/auth-service/v1/auth/logout',
		expose: true,
		tags: ['main-model', 'logout-cache-control']
	},
	authController.logout
);

export const checkUsername = api(
	{
		method: 'GET',
		path: '/auth-service/v1/auth/check-username',
		expose: true,
		tags: ['main-model']
	},
	authController.checkUsername
);
