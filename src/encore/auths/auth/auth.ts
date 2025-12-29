import { APIError, Gateway } from 'encore.dev/api';
import { authHandler } from 'encore.dev/auth';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import mainModel from '../../../models/main-model';
import type { AccessDecoded, AuthData } from '../../../types';
import type { AuthReq } from '../../../types/request';

async function mainAuth({ authorization, csrf }: AuthReq): Promise<AuthData> {
	console.log('MAIN AUTH CALLED');
	if (!authorization.startsWith('Bearer')) {
		throw APIError.unauthenticated('Bearer missing!');
	}
	if (!csrf || csrf === 'undefined' || csrf === 'null') {
		throw APIError.unauthenticated('CSRF token missing!');
	}
	const clientId = authorization.split(' ')[1];
	if (!clientId || clientId === 'undefined' || clientId === 'null') {
		throw APIError.unauthenticated('Client ID missing!');
	}

	const model = await mainModel;
	const token = await model.token.findOne({
		where: {
			clientId,
			accessExp: {
				[Op.gte]: new Date(Date.now() - 15 * 60 * 1000)
			}
		}
	});
	if (!token) throw APIError.permissionDenied('Invalid token!');

	const accessToken = token.access;
	const foundToken = jwt.verify(
		accessToken,
		`${process.env.ACCESS_TOKEN_SECRET}`
	) as (string | jwt.JwtPayload) & AccessDecoded;
	if (!Object.hasOwn(foundToken, 'UserInfo')) {
		console.log(foundToken);
		throw APIError.permissionDenied('Invalid credentials!');
	}

	return {
		userID: foundToken.UserInfo.id,
		username: foundToken.UserInfo.username,
		role: foundToken.UserInfo.role,
		refreshToken: token.refresh
	};
}

export const auth = authHandler<AuthReq, AuthData>(mainAuth);

export const getaway = new Gateway({ authHandler: auth });
