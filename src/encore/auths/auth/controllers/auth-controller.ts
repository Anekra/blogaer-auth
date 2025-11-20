import type { IncomingMessage, ServerResponse } from 'http';
import bcryptjs from 'bcryptjs';
import { type APICallMeta, currentRequest } from 'encore.dev';
import { APIError, ErrCode } from 'encore.dev/api';
import jwt from 'jsonwebtoken';
import { col, fn, Op, where } from 'sequelize';
import type { MainModel } from '../../../../models/main-model';
import type Token from '../../../../models/token';
import type User from '../../../../models/user';
import type { RefreshDecoded } from '../../../../types';
import type {
	LoginReq,
	RefreshTokenReq,
	RegisterReq,
	XAuthReq
} from '../../../../types/request';
import { CommonStatus, EmailSubject } from '../../../../utils/enums';
import { catchError, generateRandomChars } from '../../../../utils/helper';
import emailService from '../../../email/service/email-service';
import jwtService from '../services/jwt-service';

const authController = {
	async register({ ua, xff, username, email, password }: RegisterReq) {
		if (!password) {
			console.log('REGISTER auth-controller >> Password field is empty!');
			throw APIError.invalidArgument('Password is empty!');
		}

		const hashPassword = await bcryptjs.hash(password, 10);

		try {
			const callMeta = currentRequest() as APICallMeta;
			const model = callMeta.middlewareData?.mainModel as MainModel;

			const userExists = await model.user.findOne({
				where: {
					[Op.or]: [
						{ email },
						where(fn('lower', col('username')), username.toLowerCase())
					]
				}
			});
			if (userExists) {
				console.log('REGISTER auth-controller >> Username already exists!');
				throw APIError.invalidArgument('Username already exists!');
			}

			const name = `${email.split('@')[0]}${generateRandomChars(4)}`;
			const user = await model.user.create({
				username,
				email,
				name,
				password: hashPassword,
				roleId: 2
			});

			if (!user || !user.id) {
				console.warn('REGISTER auth-controller >> User registration failed!');
				throw APIError.internal('User registration failed!');
			}

			const [accessToken, refreshToken] = await jwtService.generateJwt(
				user.id,
				user.username,
				user.roleId,
				ua
			);

			const ip = xff ? xff.split(',')[0].trim() : "127.0.0.1";
			const clientId = crypto.randomUUID();
			const { csrf } = await model.token.create({
				refresh: refreshToken,
				access: accessToken,
				userId: user.id,
				ipAddress: ip,
				userAgent: ua,
				revoked: false,
				clientId
			});

			const code = crypto.randomUUID();
			const url = new URL(
				`${process.env.BASE_URL}/auth-service/v1/auth/verify-email`
			);
			url.searchParams.set('username', `${username}`);
			url.searchParams.set('subject', `${EmailSubject.VerifyEmail}`);
			url.searchParams.set('code', `${code}`);
			const html = emailService.createLinkHtml(
				url.href,
				EmailSubject.VerifyEmail
			);
			await emailService.sendEmail(user.email, 'Verify email address', html);
			const now = Date.now();
			const limit = new Date(now + 24 * 60 * 60 * 1000);
			await model.userRequest.create({
				userId: user.id,
				clientId,
				request: EmailSubject.VerifyEmail,
				limit,
				status: CommonStatus.Pending,
				code
			});

			return {
				status: 'Registered',
				message: 'User registered successfully.',
				data: {
					clientId,
					csrf,
					username: user.username,
					email: user.email,
					name,
					role: user.roleId === 2 ? 'Author' : 'Admin'
				}
			};
		} catch (error) {
			const [err] = catchError('REGISTER auth-controller', error);
			throw err;
		}
	},
	async login({ ua, xff, emailOrUsername, password }: LoginReq) {
		const callMeta = currentRequest() as APICallMeta;
		const model = callMeta.middlewareData?.mainModel as MainModel;
		const payload = emailOrUsername.trim();
		const user = await model.user.findOne({
			where: {
				[Op.or]: [
					{ email: payload },
					where(fn('lower', col('username')), payload.toLowerCase())
				]
			}
		});
		if (!user || !user.password) {
			const errMsg = `LOGIN auth-controller >> ${
				!user?.password ? 'Password field is empty!' : "Username doesn't exist!"
			}`;
			console.warn(errMsg);

			throw new APIError(ErrCode.InvalidArgument, errMsg);
		}
		const correctPassword = bcryptjs.compare(password, user.password);
		if (!correctPassword) {
			console.warn('LOGIN auth-controller >> Password is incorrect!');
			throw new APIError(ErrCode.InvalidArgument, 'Password is incorrect!');
		}
		try {
			if (!user.id) return APIError.notFound('User not found!');

			const [accessToken, refreshToken] = await jwtService.generateJwt(
				user.id,
				user.username,
				user.roleId,
				ua
			);
			const ip = xff ? xff.split(',')[0].trim() : "127.0.0.1";
			const clientId = crypto.randomUUID();
			await model.token.create({
				refresh: refreshToken,
				access: accessToken,
				userId: user.id,
				ipAddress: ip,
				userAgent: ua,
				revoked: false,
				clientId
			});

			return {
				status: 'Success',
				data: {
					username: user.username,
					name: user.name,
					email: user.email,
					desc: user.description,
					role: user.roleId === 1 ? 'Admin' : 'Author',
					img: user.picture,
					access: accessToken,
					refresh: refreshToken
				}
			};
		} catch (error) {
			const [err] = catchError('LOGIN auth-controller', error);
			throw err;
		}
	},
	async verifyEmail(req: IncomingMessage, res: ServerResponse) {
		// need to fix the patch feature for the display name after email verified
		// and fix redirect conditions related to email verification
		const url = new URL(`${process.env.BASE_URL}${req.url}`);
		const params = url.searchParams;
		const username = params.get('username');
		const subject = params.get('subject');
		const code = params.get('code');
		if (subject !== EmailSubject.VerifyEmail) {
			console.warn('VERIFY EMAIL auth-controller >> Not a valid subject!');
			res.writeHead(302, {
				Location: `${process.env.CLIENT_URL}/auth/email/status/${username}?request=${subject}&verified=false`
			});
			res.end();
		}

		if (username && subject && code) {
			const callMeta = currentRequest() as APICallMeta;
			const model = callMeta.middlewareData?.mainModel as MainModel;
			const user = await model.user.findOne({
				where: {
					username
				}
			});
			const request = await model.userRequest.findOne({
				where: {
					request: subject,
					code,
					limit: {
						[Op.gt]: new Date()
					}
				}
			});

			if (user && request) {
				let Location = `${process.env.CLIENT_URL}/auth/email/status/${username}?request=${subject}&verified=true&message=email-already-verified`;
				if (!user.verified) {
					user.update({ verified: true });
					request.update({ status: CommonStatus.Success });
					Location = `${process.env.CLIENT_URL}/auth/email/status/${username}?request=${subject}&verified=true`;
				}
				res.writeHead(302, { Location });
				res.end();
			} else {
				console.warn(
					'VERIFY EMAIL auth-controller >> Verify email request not found!'
				);
				res.writeHead(302, {
					Location: `${process.env.CLIENT_URL}/auth/email/status/${username}?request=${subject}&verified=false&message=request-not-found`
				});
				res.end();
			}
		} else {
			console.warn('VERIFY EMAIL auth-controller >> Invalid request!');
			res.writeHead(302, {
				Location: `${process.env.CLIENT_URL}/auth/email/status/${username}?request=${subject}&verified=false&message=invalid-request`
			});
			res.end();
		}
	},
	async refreshToken({ xAuth, ua: userAgent }: RefreshTokenReq) {
		// NEED TO CHECK IF THE REFRESH TOKEN API STILL WORKS
		if (!xAuth.startsWith('Bearer')) return null;
		const callMeta = currentRequest() as APICallMeta;
		const model = callMeta.middlewareData?.mainModel as MainModel;
		const clientId = xAuth.split(' ')[1];
		if (!clientId || clientId === 'undefined') {
			return APIError.unauthenticated('Missing clientId!');
		}

		const token = await model.token.findOne({
			where: { clientId }
		});
		if (!token) return APIError.permissionDenied('Token not found!');

		const refreshToken = token.refresh;
		const foundToken = (await model.token.findByPk(refreshToken, {
			include: [
				{
					model: model.user,
					attributes: ['id', 'username', 'roleId']
				}
			]
		})) as Token & { User: User };
		const foundUserId = foundToken.User.id;
		if (!foundUserId) return APIError.notFound('User not found!');

		const decodedToken = jwt.verify(
			refreshToken,
			`${process.env.REFRESH_TOKEN_SECRET}`
		) as (string | jwt.JwtPayload) & RefreshDecoded;
		const decodedUsername = decodedToken.UserInfo.username;

		try {
			// Refresh token reuse detection!
			if (!foundToken) {
				if (decodedUsername) {
					const hackedUser = await model.user.findOne({
						where: {
							username: decodedToken.UserInfo.username
						}
					});
					if (hackedUser) {
						const deletedTokens = await model.token.destroy({
							where: {
								userId: hackedUser.id
							}
						});
						console.warn(
							'REFRESH TOKEN auth-controller >>',
							`Reuse detected, deleting ${hackedUser.username}'s tokens:`,
							deletedTokens
						);
					}
				}

				console.warn(
					'REFRESH TOKEN auth-controller >> Refresh token reuse detected!'
				);

				throw new APIError(
					ErrCode.PermissionDenied,
					'Refresh token reuse detected!'
				);
			}

			const foundUsername = foundToken.User.username;
			if (foundUsername && decodedUsername) {
				if (foundUsername !== decodedUsername) {
					console.warn(
						'REFRESH TOKEN auth-controller >>',
						`Found token ${foundUsername} and decoded token ${decodedUsername} don't match!`
					);

					return new APIError(ErrCode.PermissionDenied, "Tokens don't match!");
				}

				// Refresh token is still valid
				const [accessToken, newRefreshToken] = await jwtService.generateJwt(
					foundUserId,
					foundUsername,
					foundToken.User.roleId,
					userAgent
				);
				await model.token.update(
					{ refresh: newRefreshToken, access: accessToken },
					{ where: { refresh: refreshToken } }
				);

				return {
					status: 'Created',
					message: 'New refresh token created successfully',
					data: {
						username: decodedToken.UserInfo.username,
						access: accessToken,
						refresh: newRefreshToken
					}
				};
			}
		} catch (error) {
			if (error instanceof jwt.JsonWebTokenError) {
				console.error(
					'REFRESH TOKEN auth-controller >> Invalid JWT:',
					error.message
				);

				return new APIError(
					ErrCode.PermissionDenied,
					'Invalid refresh token signature!'
				);
			}
			if (error instanceof jwt.NotBeforeError) {
				console.error('REFRESH TOKEN auth-controller >> Token not yet active.');

				throw APIError.invalidArgument(
					'Token is not active yet! Please try again later.'
				);
			}
			if (error instanceof jwt.TokenExpiredError) {
				if (decodedUsername) {
					const deletedTokens = await model.token.destroy({
						where: {
							refresh: refreshToken
						}
					});
					console.error(
						'REFRESH TOKEN auth-controller >>',
						`Session expired, deleting ${decodedUsername}'s tokens:`,
						deletedTokens
					);

					throw APIError.permissionDenied('refresh token expired!');
				}
			}
			const [err] = catchError('REFRESH TOKEN auth-controller', error);

			throw err;
		}
	},
	async logout({ xAuth }: XAuthReq) {
		try {
			const callMeta = currentRequest() as APICallMeta;
			const model = callMeta.middlewareData?.mainModel as MainModel;
			const clientId = xAuth.split(' ')[1];
			if (!clientId || clientId === 'undefined') {
				return APIError.unauthenticated('Missing clientId!');
			}

			const token = await model.token.findOne({
				where: { clientId }
			});
			if (!token) return APIError.permissionDenied('Token not found!');
			await model.token.destroy({
				where: { refresh: token.refresh }
			});

			return;
		} catch (error) {
			const [err] = catchError('LOGOUT auth-controller', error);
			throw err;
		}
	},
	async checkUsername({ xAuth }: XAuthReq) {
		try {
			const callMeta = currentRequest() as APICallMeta;
			const model = callMeta.middlewareData?.mainModel as MainModel;
			const clientId = xAuth.split(' ')[1];
			if (!clientId || clientId === 'undefined') {
				throw APIError.unauthenticated('Missing clientId!');
			}

			const token = await model.token.findOne({
				where: { clientId }
			});
			if (!token) throw APIError.permissionDenied('Token not found!');

			const foundToken = (await model.token.findByPk(token.refresh, {
				attributes: ['token'],
				include: {
					model: model.user,
					attributes: ['username']
				}
			})) as Token & { User: { username: string } };

			if (!foundToken) {
				console.warn(
					'CHECK USERNAME auth-controller >> Refresh token not found!'
				);

				throw new APIError(
					ErrCode.PermissionDenied,
					'Refresh token not found!'
				);
			}

			return {
				status: 'Success',
				data: { username: foundToken.User.username }
			};
		} catch (error) {
			const [err] = catchError('CHECK USERNAME auth-controller', error);
			throw err;
		}
	}
};

export default authController;
