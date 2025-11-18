import { type APICallMeta, currentRequest } from 'encore.dev';
import { APIError, ErrCode } from 'encore.dev/api';
import { col, fn, Op, where } from 'sequelize';
import type { MainModel } from '../../../../models/main-model';
import type SavedAccount from '../../../../models/saved-account';
import type User from '../../../../models/user';
import type { DeleteSavedAccountReq, UAReq } from '../../../../types/request';
import { catchError, generateUAId } from '../../../../utils/helper';

const savedAccountController = {
	async getSavedAccounts({ userAgent }: UAReq) {
		try {
			const callMeta = currentRequest() as APICallMeta;
			const model = callMeta.middlewareData?.mainModel as MainModel;
			// temp
			await model.sequelize.query('DELETE FROM users');
			await model.sequelize.query('DELETE FROM tokens');
			await model.sequelize.query(
			  "DELETE FROM sqlite_sequence WHERE name = 'user_requests'"
			);
			await model.sequelize.query('DELETE FROM user_requests');

			const aWeekAgo = new Date();
			aWeekAgo.setDate(aWeekAgo.getDate() - 7);
			await model.savedAccount.destroy({
				where: {
					updatedAt: {
						[Op.lt]: aWeekAgo,
					},
				},
			});

			const { uAId } = generateUAId(userAgent);
			if (!uAId) {
				console.warn(
					'GET SAVED ACCOUNTS saved-account-controller >> User agent is empty!',
					userAgent,
				);

				throw new APIError(
					ErrCode.InvalidArgument,
					'No user-agent data provided!',
				);
			}
			const savedAccount = (await model.savedAccount.findByPk(uAId, {
				include: {
					model: model.user,
					attributes: ['id', 'username', 'email', ['picture', 'img']],
				},
				attributes: ['id'],
				raw: true,
				nest: true,
			})) as SavedAccount & { Users: User[] };
			if (savedAccount) {
				return {
					status: 'Success',
					data: savedAccount.Users,
				};
			}

			return;
		} catch (error) {
			const [err] = catchError(
				'GET SAVED ACCOUNTS saved-account-controller',
				error,
			);
			throw err;
		}
	},
	async deleteAccount({ username, userAgent }: DeleteSavedAccountReq) {
		try {
			const callMeta = currentRequest() as APICallMeta;
			const model = callMeta.middlewareData?.mainModel as MainModel;
			const { uAId } = generateUAId(userAgent);
			if (!uAId) {
				console.warn(
					'GET SAVED ACCOUNTS saved-account-controller >> User agent is empty!',
				);

				throw new APIError(
					ErrCode.InvalidArgument,
					'No user-agent data provided!',
				);
			}
			const savedAccount = await model.savedAccount.findByPk(uAId);
			const user = await model.user.findOne({
				where: where(
					fn('lower', col('username')),
					username.trim().toLowerCase(),
				),
			});

			if (!savedAccount || !user) {
				console.warn(
					'DELETE ACCOUNT saved-account-controller.ts >>',
					!savedAccount ? 'saved account not found!' : 'user not found!',
				);

				throw new APIError(
					ErrCode.NotFound,
					!savedAccount ? 'saved account not found!' : 'user not found!',
				);
			}
			await savedAccount.destroy();
			await savedAccount.removeUser(user);

			return;
		} catch (error) {
			const [err] = catchError(
				'DELETE ACCOUNT saved-account-controller',
				error,
			);

			throw err;
		}
	},
};

export default savedAccountController;
