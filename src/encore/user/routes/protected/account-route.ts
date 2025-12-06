import { api } from 'encore.dev/api';
import type { PatchAccountReq } from '../../../../types/request';
import type { DefaultRes } from '../../../../types/response';
import userController from '../../controllers/user-controller';

export const getAccount = api(
	{
		method: 'GET',
		path: '/auth-service/v1/user/account',
		auth: true,
		expose: true,
		tags: ['main-model']
	},
	userController.getAccount
);

export const patchAccount = api<PatchAccountReq, Promise<DefaultRes>>(
	{
		method: 'PATCH',
		path: '/auth-service/v1/user/account',
		auth: true,
		expose: true,
		tags: ['main-model']
	},
	userController.patchAccount
);

export const patchAccountEmail = api(
	{
		method: 'PATCH',
		path: '/auth-service/v1/user/account/update-email',
		auth: true,
		expose: true,
		tags: ['verify-request-form-otp', 'main-model']
	},
	userController.patchAccount
);

export const patchAccountUsername = api(
	{
		method: 'PATCH',
		path: '/auth-service/v1/user/account/update-username',
		auth: true,
		expose: true,
		tags: ['verify-request-form', 'main-model']
	},
	userController.patchAccount
);
