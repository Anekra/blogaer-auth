import { api } from 'encore.dev/api';
import type { LoginReq, RegisterReq } from '../../../../../types/request';
import type { LoginRes, RegisterRes } from '../../../../../types/response';
import authController from '../../controllers/auth-controller';

export const register = api<RegisterReq, Promise<RegisterRes>>(
	{
		method: 'POST',
		path: '/auth-service/v1/auth/register',
		expose: true,
		tags: ['main-model']
	},
	authController.register
);

export const login = api<LoginReq, Promise<LoginRes>>(
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
