import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Channel } from 'amqplib';
import { type APICallMeta, currentRequest } from 'encore.dev';
import { APIError, ErrCode } from 'encore.dev/api';
import type { MainModel } from '../../../../models/main-model';
import { ExchangeName, OauthProvider } from '../../../../utils/enums';
import {
	catchError,
	closeChannel,
	errCodeToHttpStatus,
	generateRandomChars
} from '../../../../utils/helper';
import jwtService from '../../auth/services/jwt-service';

const oauthController = {
	async google(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const callMeta = currentRequest() as APICallMeta;
		const rpcConChan = callMeta.middlewareData?.rpcConChan as Channel;
		const rpcPubChan = callMeta.middlewareData?.rpcPubChan as Channel;
		const model = callMeta.middlewareData?.mainModel as MainModel;
		const code = callMeta.middlewareData?.oauthCode as string;

		const userAgent = req.headers['user-agent'];
		if (!userAgent || userAgent === 'undefined') {
			throw APIError.permissionDenied('No forwarded-for header');
		}

		const xff = req.headers['x-forwarded-for'];
		if (typeof xff !== 'string' || !xff || xff === 'undefined') {
			throw APIError.permissionDenied('No forwarded-for header');
		}

		const timeout = setTimeout(() => {
			console.warn('GOOGLE auth-controller >> Request timeout!');
			res.statusCode = 408;
			res.setHeader('Content-Type', 'application/json');
			return res.end(
				JSON.stringify({
					code: ErrCode.DeadlineExceeded,
					message: 'Request timeout!',
					details: '10 seconds of request time reached.'
				})
			);
		}, 5000);

		try {
			const { queue } = await rpcConChan.assertQueue('', {
				exclusive: true,
				durable: false
			});
			const correlationId = crypto.randomUUID();
			const message = Buffer.from(JSON.stringify({ code }));
			rpcPubChan.publish(ExchangeName.Rpc, 'oauth.google.key', message, {
				persistent: false,
				replyTo: queue,
				correlationId
			});
			await rpcConChan.consume(queue, async (msg) => {
				if (!msg) {
					throw APIError.internal('Google login failed! No user info data.');
				}

				if (msg.properties.correlationId !== correlationId) {
					throw APIError.internal('Correlation id mismatch!');
				}

				const userInfo = JSON.parse(msg.content.toString());
				const [user, isCreated] = await model.user.findOrCreate({
					where: {
						email: userInfo.email
					},
					defaults: {
						username: userInfo.given_name + generateRandomChars(4),
						name: userInfo.given_name,
						email: userInfo.email,
						picture: userInfo.picture,
						roleId: 2,
						verified: true
					}
				});
				if (!user.id) {
					throw APIError.internal('Google login failed! User does not exist!');
				}

				if (isCreated) {
					await model.userOauth.create({
						userId: user.id,
						oauthProvider: OauthProvider.Google,
						oauthEmail: user.email
					});
				}

				const ip = xff ? xff.split(',')[0].trim() : '127.0.0.1';
				const [accessToken, refreshToken] = await jwtService.generateJwt(
					user.id,
					user.username,
					user.roleId,
					userAgent
				);

				const clientId = crypto.randomUUID();
				const { csrf } = await model.token.create({
					refresh: refreshToken,
					access: accessToken,
					userId: `${user.id}`,
					ipAddress: ip,
					userAgent,
					revoked: false,
					loginWith: OauthProvider.Google,
					clientId
				});

				res.statusCode = 200;
				res.setHeader('Content-Type', 'application/json');
				res.end(
					JSON.stringify({
						status: 'Success',
						data: {
							clientId,
							csrf,
							username: user.username,
							name: user.name,
							email: user.email,
							desc: user.description,
							img: user.picture,
							exp: Date.now() / 1000 + 10 * 60,
							role: user.roleId === 2 ? 'Author' : 'Admin',
							isVerified: user.verified ?? false
						}
					})
				);
				rpcConChan.ack(msg);
				await closeChannel(timeout, rpcConChan);
			});
		} catch (error) {
			const [err, errMsg] = catchError('GOOGLE oauth-controller', error);
			const isApiError = err instanceof APIError;

			res.statusCode = isApiError ? errCodeToHttpStatus(err.code) : 500;
			res.setHeader('Content-Type', 'application/json');
			res.end(
				JSON.stringify({
					code: ErrCode.Internal,
					message: errMsg,
					details: isApiError ? err.details : 'Unknown error occurred!'
				})
			);
			await closeChannel(timeout, rpcConChan);
			throw err;
		}
	},
	async github(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const callMeta = currentRequest() as APICallMeta;
		const rpcConChan = callMeta.middlewareData?.rpcConChan as Channel;
		const rpcPubChan = callMeta.middlewareData?.rpcPubChan as Channel;
		const model = callMeta.middlewareData?.mainModel as MainModel;
		const code = callMeta.middlewareData?.oauthCode as string;

		const userAgent = req.headers['user-agent'];
		if (!userAgent || userAgent === 'undefined') {
			throw APIError.permissionDenied('No forwarded-for header');
		}

		const xff = req.headers['x-forwarded-for'];
		if (typeof xff !== 'string' || !xff || xff === 'undefined') {
			throw APIError.permissionDenied('No forwarded-for header');
		}

		const timeout = setTimeout(() => {
			console.warn('GITHUB auth-controller >> Request timeout!');
			res.statusCode = 408;
			res.setHeader('Content-Type', 'application/json');
			return res.end(
				JSON.stringify({
					code: ErrCode.DeadlineExceeded,
					message: 'Request timeout!',
					details: '10 seconds of request time reached.'
				})
			);
		}, 10000);

		try {
			const { queue } = await rpcConChan.assertQueue('', {
				exclusive: true,
				durable: false
			});
			const correlationId = crypto.randomUUID();
			const message = Buffer.from(JSON.stringify({ code }));
			rpcPubChan.publish(ExchangeName.Rpc, 'oauth.github.key', message, {
				persistent: false,
				replyTo: queue,
				correlationId
			});
			await rpcConChan.consume(queue, async (msg) => {
				if (!msg) {
					throw APIError.internal('Github login failed! User does not exist!');
				}

				if (msg.properties.correlationId !== correlationId) {
					throw APIError.internal('Correlation id mismatch!');
				}

				const userData = JSON.parse(msg.content.toString());
				const userInfo = userData.userInfo;
				const userEmail = userData.userEmail.email;
				const name = (userInfo.name as string).split(' ')[0];
				const [user, isCreated] = await model.user.findOrCreate({
					where: {
						email: userEmail
					},
					defaults: {
						username: name + generateRandomChars(4),
						name,
						email: userEmail,
						picture: userInfo.avatar_url,
						roleId: 2,
						verified: userEmail != null
					}
				});
				if (!user.id) {
					throw APIError.internal('Github login failed! User does not exist!');
				}
				if (isCreated) {
					await model.userOauth.findOrCreate({
						where: {
							userId: user.id,
							oauthProvider: OauthProvider.Github,
							oauthEmail: user.email
						}
					});
				}

				const ip = xff ? xff.split(',')[0].trim() : '127.0.0.1';
				const [accessToken, newRefreshToken] = await jwtService.generateJwt(
					user.id,
					user.username,
					user.roleId,
					userAgent
				);

				const clientId = crypto.randomUUID();
				const { csrf } = await model.token.create({
					refresh: newRefreshToken,
					access: accessToken,
					userId: `${user.id}`,
					ipAddress: ip,
					userAgent,
					revoked: false,
					loginWith: OauthProvider.Github,
					clientId
				});

				res.statusCode = 200;
				res.setHeader('Content-Type', 'application/json');
				res.end(
					JSON.stringify({
						status: 'Success',
						data: {
							clientId,
							csrf,
							username: user.username,
							name: user.name,
							email: user.email,
							desc: user.description,
							img: user.picture,
							exp: Date.now() / 1000 + 10 * 60,
							role: user.roleId === 2 ? 'Author' : 'Admin',
							isVerified: user.verified ?? false
						}
					})
				);
				rpcConChan.ack(msg);
				await closeChannel(timeout, rpcConChan);
			});
		} catch (error) {
			const [err, errMsg] = catchError('GITHUB oauth-controller', error);
			const isApiError = err instanceof APIError;

			res.statusCode = isApiError ? errCodeToHttpStatus(err.code) : 500;
			res.setHeader('Content-Type', 'application/json');
			res.end(
				JSON.stringify({
					code: ErrCode.Internal,
					message: errMsg,
					details: isApiError ? err.details : 'Unknown error occurred!'
				})
			);
			await closeChannel(timeout, rpcConChan);
			throw err;
		}
	}
};

export default oauthController;
