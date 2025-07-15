import { APICallMeta, currentRequest } from 'encore.dev';
import { EmailOrUsernameReq } from '../../../../types/request';
import { MainModel } from '../../../../models/main-model';
import { Op } from 'sequelize';
import User from '../../../../models/user';
import UserSetting from '../../../../models/user-setting';
import UserPasskey from '../../../../models/user-passkey';
import UserTotpSecret from '../../../../models/user-totp-secret';
import { APIError, ErrCode } from 'encore.dev/api';
import { catchError } from '../../../../utils/helper';

const twoFaController = {
  async getTwoFAStatus({ emailOrUsername }: EmailOrUsernameReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const payload = emailOrUsername.trim();
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
        include: [
          {
            model: model.userSetting,
            attributes: ['twoFaEnabled', 'twoFaMethod']
          },
          {
            model: model.userPasskey,
            attributes: ['publicKey']
          },
          {
            model: model.userTotpSecret,
            attributes: ['secret']
          }
        ]
      })) as User & {
        UserSetting: UserSetting;
        UserPasskeys: UserPasskey[];
        UserTotpSecret: UserTotpSecret;
      };
      if (
        !user.UserSetting.twoFaMethod ||
        (!user.UserPasskeys && !user.UserTotpSecret)
      ) {
        console.warn(
          'auth-controller.ts >>',
          'Missing two factor authentication!'
        );

        throw new APIError(
          ErrCode.PermissionDenied,
          'Missing two factor authentication!'
        );
      }

      return {
        status: 'Success',
        data: { method: user.UserSetting.twoFaMethod }
      };
    } catch (error) {
      const [err] = catchError('CHECK TWO FA two-fa-controller', error);
      throw err;
    }
  }
};

export default twoFaController;
