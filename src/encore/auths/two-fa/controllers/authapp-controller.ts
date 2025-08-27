import { APICallMeta, currentRequest } from 'encore.dev';
import { MainModel } from '../../../../models/main-model';
import {
  AuthAppLoginReq,
  UsernameReq,
  VerifyAuthAppReq
} from '../../../../types/request';
import { col, fn, Op, where } from 'sequelize';
import User from '../../../../models/user';
import UserTotpSecret from '../../../../models/user-totp-secret';
import { APIError, ErrCode } from 'encore.dev/api';
import { authenticator } from 'otplib';
import jwtService from '../../auth/services/jwt-service';
import { catchError, generateUAId, getAuth } from '../../../../utils/helper';
import qrcode from 'qrcode';
import { InMemoryModel } from '../../../../models/in-memory/in-mem-model';
import { TwoFAMethod } from '../../../../utils/enums';

const authAppController = {
  async authAppLogin({ emailOrUsername, token, userAgent }: AuthAppLoginReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const payload = emailOrUsername.trim();
      const user = (await model.user.findOne({
        where: {
          [Op.or]: [
            { email: payload },
            where(fn('lower', col('username')), payload.toLowerCase())
          ]
        },
        include: {
          model: model.userTotpSecret,
          attributes: ['secret']
        }
      })) as User & { UserTotpSecret: UserTotpSecret };

      if (!user.id) {
        console.warn('AUTH APP LOGIN authapp-controller >> User do not exist!');

        throw new APIError(ErrCode.NotFound, 'User do not exist!');
      }

      const isValid = authenticator.check(token, user.UserTotpSecret.secret);
      if (!isValid) {
        console.warn(
          'AUTH APP LOGIN authapp-controller >> Token does not match!'
        );

        throw new APIError(ErrCode.InvalidArgument, 'Token does not match!');
      }
      const [accessToken, newRefreshToken] = await jwtService.generateJwt(
        user.username,
        user.roleId,
        user.id
      );

      const { uAId } = generateUAId(userAgent);
      if (!uAId) {
        console.warn(
          'AUTH APP LOGIN authapp-controller >> User agent is empty!'
        );

        throw new APIError(
          ErrCode.InvalidArgument,
          'No user-agent data provided!'
        );
      }

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
          refresh: newRefreshToken
        }
      };
    } catch (error) {
      const [err] = catchError('AUTH APP LOGIN authapp-controller', error);
      throw err;
    }
  },
  async registerAuthApp() {
    const callMeta = currentRequest() as APICallMeta;
    const model = callMeta.middlewareData?.mainModel as MainModel;
    const inMemModel = callMeta.middlewareData?.inMemModel as InMemoryModel;
    const userId = callMeta.middlewareData?.userId as string;
    try {
      const user = await model.user.findByPk(userId, { attributes: ['email'] });
      if (!user?.email) {
        console.warn(
          "REGISTER AUTH APP authapp-controller >> user doesn't exist!"
        );

        throw new APIError(ErrCode.NotFound, "User doesn't exist!");
      }

      const secret = authenticator.generateSecret();
      const uri = authenticator.keyuri(user.email, 'Blogaer', secret);
      qrcode.toDataURL(uri, async (err, url) => {
        if (err) {
          console.warn(
            'REGISTER AUTH APP authapp-controller >> Something is wrong when generating the qrcode:',
            err
          );

          throw new APIError(
            ErrCode.Internal,
            `Something is wrong when generating the qrcode!: ${err.message}`
          );
        }
        const tempSecret = await inMemModel.totpSecret.create({
          userId,
          secret
        });

        return { status: 'Success', data: { url, secretId: tempSecret.id } };
      });
    } catch (error) {
      await inMemModel.totpSecret.truncate({
        cascade: true,
        restartIdentity: true
      });
      const [err] = catchError('REGISTER AUTH APP authapp-controller', error);

      throw err;
    }
  },
  async verifyAuthApp({ token, secretId }: VerifyAuthAppReq) {
    const callMeta = currentRequest() as APICallMeta;
    const model = callMeta.middlewareData?.mainModel as MainModel;
    const inMemModel = callMeta.middlewareData?.inMemModel as InMemoryModel;
    const userId = callMeta.middlewareData?.userId as string;
    try {
      const userSecret = await inMemModel.totpSecret.findByPk(secretId, {
        attributes: ['secret']
      });
      if (!userSecret?.secret) {
        inMemModel.totpSecret.truncate({
          cascade: true,
          restartIdentity: true
        });
        console.warn(
          'VERIFY AUTH APP authapp-controller >> User authenticator secret not found!'
        );

        throw new APIError(
          ErrCode.NotFound,
          'User authenticator secret not found!'
        );
      }

      const secret = userSecret?.secret;
      const isValid = authenticator.verify({ token, secret });
      if (!isValid) {
        console.warn(
          'VERIFY AUTH APP authapp-controller >> User authenticator secret not found!'
        );

        throw new APIError(ErrCode.InvalidArgument, "Token doesn't match!");
      }

      const savedSecret = await model.userTotpSecret.create({ userId, secret });
      if (savedSecret) {
        inMemModel.totpSecret.truncate({
          cascade: true,
          restartIdentity: true
        });
      }

      return { status: 'Created', message: 'Token verified.' };
    } catch (error) {
      await inMemModel.totpSecret.truncate({
        cascade: true,
        restartIdentity: true
      });
      const [err] = catchError('VERIFY AUTH APP authapp-controller', error);

      throw err;
    }
  },
  async getAuthAppToken({ username }: UsernameReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const payload = username.trim();
      const user = (await model.user.findOne({
        where: {
          [Op.or]: {
            email: payload,
            username: {
              [Op.like]: `%${payload.toLowerCase()}%`
            }
          }
        },
        attributes: ['id'],
        include: {
          model: model.userTotpSecret,
          attributes: ['secret']
        }
      })) as User & { UserTotpSecret: UserTotpSecret };
      const secret = user.UserTotpSecret.secret;
      const token = authenticator.generate(secret);
      const isValid = authenticator.verify({ token, secret });

      return { status: 'success', data: { token, isValid, secret } };
    } catch (error) {
      const [err] = catchError('GET AUTH APP TOKEN authapp-controller', error);
      throw err;
    }
  },
  async deleteAuthAppSecret() {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const userId = callMeta.middlewareData?.userId as string;
      const authData = getAuth();
      const token = await model.token.findByPk(authData.refreshToken, {
        attributes: ['clientId']
      });
      const clientId = token?.clientId;
      await model.userTotpSecret.destroy({ where: { userId } });

      const userPasskey = await model.userPasskey.findOne({
        where: { userId, clientId }
      });
      if (userPasskey) {
        await model.userSetting.update(
          { twoFaMethod: TwoFAMethod.Passkey },
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
        'DELETE AUTH APP SECRET authapp-controller',
        error
      );

      throw err;
    }
  }
};

export default authAppController;
