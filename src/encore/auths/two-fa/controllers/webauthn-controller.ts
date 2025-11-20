import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	type PublicKeyCredentialCreationOptionsJSON,
	type PublicKeyCredentialRequestOptionsJSON,
	type VerifiedAuthenticationResponse,
	type VerifiedRegistrationResponse,
	verifyAuthenticationResponse,
	verifyRegistrationResponse
} from '@simplewebauthn/server';
import { type APICallMeta, currentRequest } from 'encore.dev';
import { APIError, ErrCode } from 'encore.dev/api';
import { col, fn, Op, where } from 'sequelize';
import type { InMemoryModel } from '../../../../models/in-memory/in-mem-model';
import type { MainModel } from '../../../../models/main-model';
import type User from '../../../../models/user';
import type UserPasskey from '../../../../models/user-passkey';
import type {
	UsernameReq,
	WebauthnGenerateLoginReq,
	WebauthnLoginReq,
	WebauthnVerifyLoginReq,
	WebauthnVerifyRegisterReq
} from '../../../../types/request';
import { TwoFAMethod } from '../../../../utils/enums';
import { catchError, generateUAId, getAuth } from '../../../../utils/helper';
import jwtService from '../../auth/services/jwt-service';

const webauthnController = {
	async generateWebauthnLogin({
		emailOrUsername,
		ua
	}: WebauthnGenerateLoginReq) {
		const callMeta = currentRequest() as APICallMeta;
		const model = callMeta.middlewareData?.mainModel as MainModel;
		const inMemModel = callMeta.middlewareData?.inMemModel as InMemoryModel;
		try {
			const { uAId } = generateUAId(ua);
			if (!uAId) {
				console.warn(
					'AUTH APP LOGIN webauthn-controller >> User agent is empty!'
				);

				throw new APIError(
					ErrCode.InvalidArgument,
					'No user-agent data provided!'
				);
			}

			const payload = emailOrUsername.trim();
			const user = (await model.user.findOne({
				where: {
					[Op.or]: [
						{ email: payload },
						where(fn('lower', col('username')), payload.toLowerCase())
					]
				},
				attributes: ['id'],
				include: {
					model: model.userPasskey,
					attributes: ['id', 'transports', 'clientId', 'userId'],
					where: { clientId: uAId }
				}
			})) as User & { UserPasskeys: UserPasskey[] };

			const userPasskey = user.UserPasskeys.find(
				(passkey) => passkey.clientId === uAId && passkey.userId === user.id
			);
			if (!userPasskey) {
				console.warn(
					"WEBAUTHN GENERATE LOGIN webauthn-controller >> User passkey doesn't exist"
				);

				throw new APIError(ErrCode.NotFound, "User passkey doesn't exist");
			}

			const allowCredentials = user.UserPasskeys.map((passkey) => {
				return {
					id: passkey.id,
					transports: passkey.transports
				};
			});
			const options: PublicKeyCredentialRequestOptionsJSON =
				await generateAuthenticationOptions({
					rpID: 'localhost',
					allowCredentials,
					userVerification: 'preferred'
				});

			const optionId = options.allowCredentials?.at(0)?.id;
			if (!optionId) {
				inMemModel.webAuthnLoginOption.truncate({
					cascade: true,
					restartIdentity: true
				});
				console.warn(
					'WEBAUTHN GENERATE LOGIN webauthn-controller >>No passkeys was found!'
				);

				throw new APIError(ErrCode.NotFound, 'No passkeys was found!');
			}

			await inMemModel.webAuthnLoginOption.create({
				passkeyId: optionId,
				options
			});

			return {
				status: 'Success',
				data: { options }
			};
		} catch (error) {
			await inMemModel.webAuthnLoginOption.truncate({
				cascade: true,
				restartIdentity: true
			});
			const [err] = catchError(
				'GENERATE WEBAUTHN LOGIN webauthn-controller',
				error
			);

			throw err;
		}
	},
	async verifyWebauthnLogin({ option, ua }: WebauthnVerifyLoginReq) {
		const callMeta = currentRequest() as APICallMeta;
		const model = callMeta.middlewareData?.mainModel as MainModel;
		const inMemModel = callMeta.middlewareData?.inMemModel as InMemoryModel;
		try {
			if (!option) {
				console.warn(
					'WEBAUTHN VERIFY LOGIN webauthn-controller >> Webauthn options not provided!'
				);

				throw new APIError(
					ErrCode.InvalidArgument,
					'Webauthn options not provided!'
				);
			}
			const inMemOption = await inMemModel.webAuthnLoginOption.findOne({
				where: { passkeyId: option.id }
			});
			const currentOptions = inMemOption?.options;
			if (!currentOptions?.challenge) {
				inMemModel.webAuthnLoginOption.truncate({
					cascade: true,
					restartIdentity: true
				});
				console.warn(
					'WEBAUTHN VERIFY LOGIN webauthn-controller >> Webauthn temporary option not found!'
				);

				throw new APIError(
					ErrCode.NotFound,
					'Webauthn temporary option not found!'
				);
			}

			const userPasskey = await model.userPasskey.findByPk(option.id);
			if (!userPasskey) {
				inMemModel.webAuthnLoginOption.truncate({
					cascade: true,
					restartIdentity: true
				});
				console.warn(
					'WEBAUTHN VERIFY LOGIN webauthn-controller >> User passkey not found!'
				);

				throw new APIError(ErrCode.NotFound, 'User passkey not found!');
			}

			const { uAData } = generateUAId(ua);
			if (!uAData) {
				console.warn(
					'WEBAUTHN VERIFY LOGIN webauthn-controller >> Restructured user agent is null!'
				);

				throw new APIError(
					ErrCode.InvalidArgument,
					'Restructured user agent is null!'
				);
			}
			const isMobile = uAData.platform === 'mobile';
			let verification: VerifiedAuthenticationResponse;
			verification = await verifyAuthenticationResponse({
				response: option,
				requireUserVerification: isMobile,
				expectedChallenge: currentOptions.challenge,
				expectedOrigin: 'http://localhost:3000',
				expectedRPID: 'localhost',
				credential: {
					id: userPasskey.id,
					publicKey: userPasskey.publicKey,
					counter: userPasskey.counter,
					transports: userPasskey.transports
				}
			});

			const { verified } = verification;
			if (verified) {
				await inMemModel.webAuthnLoginOption.update(
					{ verifiedAuthInfo: verification },
					{ where: { passkeyId: option.id } }
				);

				return {
					status: 'Success',
					data: { verified }
				};
			} else {
				inMemModel.webAuthnLoginOption.truncate({
					cascade: true,
					restartIdentity: true
				});

				throw new APIError(
					ErrCode.InvalidArgument,
					'Token or biometric key invalid!'
				);
			}
		} catch (error) {
			await inMemModel.webAuthnLoginOption.truncate({
				cascade: true,
				restartIdentity: true
			});
			const [err] = catchError(
				'VERIFY WEBAUTHN LOGIN webauthn-controller',
				error
			);

			throw err;
		}
	},
	async webauthnLogin({
		emailOrUsername,
		optionId,
		ua,
		xff
	}: WebauthnLoginReq) {
		const callMeta = currentRequest() as APICallMeta;
		const model = callMeta.middlewareData?.mainModel as MainModel;
		const inMemModel = callMeta.middlewareData?.inMemModel as InMemoryModel;
		try {
			const inMemOption = await inMemModel.webAuthnLoginOption.findOne({
				where: { passkeyId: optionId }
			});
			if (!inMemOption) {
				inMemModel.webAuthnLoginOption.truncate({
					cascade: true,
					restartIdentity: true
				});
				console.warn(
					'WEBAUTHN LOGIN webauthn-controller >> Webauthn login option do not match!'
				);

				throw new APIError(
					ErrCode.PermissionDenied,
					'Webauthn login option do not match!'
				);
			}

			const payload = emailOrUsername.trim();
			const user = await model.user.findOne({
				where: {
					[Op.or]: [
						{ email: payload },
						where(fn('lower', col('username')), payload.toLowerCase())
					]
				}
			});
			if (!user || !user.id) {
				console.warn(
					`WEBAUTHN LOGIN webauthn-controller >> ${emailOrUsername} doesn't exist!`
				);

				throw new APIError(
					ErrCode.NotFound,
					`${emailOrUsername} doesn't exist!`
				);
			}

			if (user.id) {
				const [accessToken, newRefreshToken] = await jwtService.generateJwt(
					user.id,
					user.username,
					user.roleId,
					ua
				);

				const ip = xff ? xff.split(',')[0].trim() : '127.0.0.1';
				const clientId = crypto.randomUUID();
				await model.token.create({
					refresh: newRefreshToken,
					access: accessToken,
					userId: user.id,
					ipAddress: ip,
					userAgent: ua,
					revoked: false,
					clientId
				});

				await inMemModel.webAuthnLoginOption.truncate({
					cascade: true,
					restartIdentity: true
				});

				return {
					status: 'Success',
					data: {
						clientId,
						username: user.username,
						name: user.name,
						email: user.email,
						desc: user.description,
						role: user.roleId === 1 ? 'Admin' : 'Author',
						img: user.picture
					}
				};
			}
		} catch (error) {
			await inMemModel.webAuthnLoginOption.truncate({
				cascade: true,
				restartIdentity: true
			});
			const [err] = catchError('WEBAUTHN LOGIN webauthn-controller', error);

			throw err;
		}
	},
	async generateRegisterWebauthn({ username }: UsernameReq) {
		const callMeta = currentRequest() as APICallMeta;
		const model = callMeta.middlewareData?.mainModel as MainModel;
		const inMemModel = callMeta.middlewareData?.inMemModel as InMemoryModel;
		try {
			const authData = getAuth();
			const userId = authData.userID;
			const user = await model.user.findByPk(userId, {
				attributes: ['name']
			});

			const userPasskeys = await model.userPasskey.findAll({
				where: { userId }
			});

			const options: PublicKeyCredentialCreationOptionsJSON =
				await generateRegistrationOptions({
					rpName: 'Blogaer-auth',
					rpID: 'localhost',
					userName: username,
					userDisplayName: user?.name,
					attestationType: 'none',
					excludeCredentials: userPasskeys.map((passkey) => ({
						id: passkey.id,
						transports: passkey.transports
					})),
					authenticatorSelection: {
						residentKey: 'required',
						userVerification: 'preferred'
					}
				});

			await inMemModel.webAuthnRegisterOption.create({
				userId,
				options
			});

			return {
				status: 'Success',
				data: { options }
			};
		} catch (error) {
			await inMemModel.webAuthnRegisterOption.truncate({
				cascade: true,
				restartIdentity: true
			});
			const [err] = catchError(
				'WEBAUTHN GENERATE REGISTER webauthn-controller',
				error
			);

			throw err;
		}
	},
	async verifyRegisterWebauthn({
		options,
		ua
	}: WebauthnVerifyRegisterReq) {
		const callMeta = currentRequest() as APICallMeta;
		const model = callMeta.middlewareData?.mainModel as MainModel;
		const inMemModel = callMeta.middlewareData?.inMemModel as InMemoryModel;
		try {
			const authData = getAuth();
			const userId = authData.userID;
			const inMemOption = await inMemModel.webAuthnRegisterOption.findOne({
				where: { userId }
			});

			const memoryOptions = inMemOption?.options;
			if (!memoryOptions?.challenge) {
				await inMemModel.webAuthnRegisterOption.truncate({
					cascade: true,
					restartIdentity: true
				});

				throw new APIError(
					ErrCode.NotFound,
					'Webauthn registration options not found!'
				);
			}

			const { uAData } = generateUAId(ua);
			if (!uAData) {
				console.warn(
					'WEBAUTHN VERIFY LOGIN webauthn-controller >> Restructured user agent is null!'
				);

				throw new APIError(
					ErrCode.InvalidArgument,
					'Restructured user agent is null!'
				);
			}

			const isMobile = uAData.platform === 'mobile';
			let verification: VerifiedRegistrationResponse;
			verification = await verifyRegistrationResponse({
				response: options,
				requireUserVerification: isMobile,
				expectedChallenge: memoryOptions.challenge,
				expectedOrigin: 'http://localhost:3000',
				expectedRPID: 'localhost'
			});

			const { verified, registrationInfo } = verification;
			if (verified && registrationInfo) {
				const { credential, credentialDeviceType, credentialBackedUp } =
					registrationInfo;
				const userPasskeys = await model.userPasskey.findAll({
					where: {
						userId
					}
				});
				const existingPasskey = userPasskeys.find(
					(key) => key.id === credential.id
				);

				const authData = getAuth();
				const token = await model.token.findByPk(authData.refreshToken, {
					attributes: ['clientId']
				});
				const clientId = token?.clientId;

				if (!existingPasskey && clientId) {
					const clientBrowser = uAData.browser;
					const clientOs = uAData.os;
					if (!clientBrowser || !clientOs) {
						console.warn(
							'WEBAUTHN VERIFY LOGIN webauthn-controller >> user-agent header is empty!'
						);

						throw new APIError(
							ErrCode.InvalidArgument,
							'user-agent header is empty!'
						);
					}

					await model.userPasskey.create({
						id: credential.id,
						userId,
						clientId,
						clientBrowser,
						clientOs,
						isMobile,
						publicKey: new Uint8Array(Buffer.from(credential.publicKey)),
						counter: credential.counter,
						deviceType: credentialDeviceType,
						backedUp: credentialBackedUp,
						transports: credential.transports
					});
				}
			}
			await inMemModel.webAuthnRegisterOption.truncate({
				cascade: true,
				restartIdentity: true
			});

			return { status: 'Success', message: { verified } };
		} catch (error) {
			await inMemModel.webAuthnRegisterOption.truncate({
				cascade: true,
				restartIdentity: true
			});
			const [err] = catchError(
				'WEBAUTHN VERIFY REGISTER webauthn-controller',
				error
			);

			throw err;
		}
	},
	async deleteWebauthnPasskey() {
		try {
			const callMeta = currentRequest() as APICallMeta;
			const model = callMeta.middlewareData?.mainModel as MainModel;
			const authData = getAuth();
			const userId = authData.userID;
			const token = await model.token.findByPk(authData.refreshToken, {
				attributes: ['clientId']
			});

			const clientId = token?.clientId;
			await model.userPasskey.destroy({ where: { userId, clientId } });

			const userSecret = await model.userTotpSecret.findOne({
				where: { userId }
			});
			if (userSecret) {
				await model.userSetting.update(
					{ twoFaMethod: TwoFAMethod.App },
					{ where: { userId } }
				);
			} else {
				await model.userSetting.update(
					{ twoFaEnabled: false, twoFaMethod: null },
					{ where: { userId } }
				);
			}

			return;
		} catch (error) {
			const [err] = catchError(
				'DELETE WEBAUTHN PASSKEY webauthn-controller',
				error
			);

			throw err;
		}
	}
};

export default webauthnController;
