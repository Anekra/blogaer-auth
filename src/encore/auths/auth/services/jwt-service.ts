import jwt from 'jsonwebtoken';
import mainModel from '../../../../models/main-model';
import type User from '../../../../models/user';
import { generateUAId } from '../../../../utils/helper';

const jwtService = {
	async generateJwt(
		id: string,
		username: string,
		roleId: number,
		userAgent?: string
	) {
		const refreshToken = jwt.sign(
			{
				UserInfo: {
					id,
					username
				}
			},
			`${process.env.REFRESH_TOKEN_SECRET}`,
			{ expiresIn: '1d' }
		);
		const accessToken = jwt.sign(
			{
				UserInfo: {
					id,
					username,
					role: roleId === 1 ? 'Admin' : 'Author'
				}
			},
			`${process.env.ACCESS_TOKEN_SECRET}`,
			{ expiresIn: '15m' }
		);

		const model = await mainModel;
		const user = (await model.user.findByPk(id, {
			include: [
				{ model: model.userSetting, attributes: ['twoFaMethod'] },
				{ model: model.savedAccount, attributes: ['id'] }
			]
		})) as User & {
			UserSetting?: { twoFaMethod: string };
			SavedAccount?: { id: string };
		};

		if (!user.UserSetting) {
			await model.userSetting.findOrCreate({
				where: { userId: id },
				defaults: { userId: id }
			});
		}

		if (!user.SavedAccount && userAgent) {
			const { uAId } = generateUAId(userAgent);
			const [savedAccount, isCreated] = await model.savedAccount.findOrCreate({
				where: { id: uAId },
				defaults: { id: uAId },
				include: {
					model: model.user,
					attributes: ['id']
				}
			});
			if (isCreated) {
				await savedAccount.addUser(user, {
					through: {
						savedAccountId: uAId,
						userId: id
					}
				});
				console.log(
					`GENERATE JWT jwt-service >> userId: ${id} Account has been saved.`
				);
			}
		}

		return [accessToken, refreshToken];
	}
};

export default jwtService;
