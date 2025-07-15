import { APICallMeta, currentRequest } from 'encore.dev';
import { MainModel } from '../../../../models/main-model';
import { col, fn, Op, where } from 'sequelize';
import { catchError, generateClientId } from '../../../../utils/helper';
import { APIError, ErrCode } from 'encore.dev/api';
import SavedAccount from '../../../../models/saved-account';
import User from '../../../../models/user';
import { DeleteSavedAccountReq, UAReq } from '../../../../types/request';
import { DefaultRes } from '../../../../types';

const savedAccountController = {
  async getSavedAccounts({ userAgent }: UAReq): Promise<DefaultRes> {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const aWeekAgo = new Date();
      aWeekAgo.setDate(aWeekAgo.getDate() - 7);
      await model.savedAccount.destroy({
        where: {
          updatedAt: {
            [Op.lt]: aWeekAgo
          }
        }
      });

      const { clientId } = generateClientId(userAgent);
      if (!clientId) {
        console.warn(
          'GET SAVED ACCOUNTS saved-account-controller >> User agent is empty!',
          userAgent
        );

        throw new APIError(
          ErrCode.InvalidArgument,
          'No user-agent data provided!'
        );
      }
      const savedAccount = (await model.savedAccount.findByPk(clientId, {
        include: {
          model: model.user,
          attributes: ['id', 'username', 'email', ['picture', 'img']]
        },
        attributes: ['clientId'],
        raw: true,
        nest: true
      })) as SavedAccount & { Users: User[] };
      if (savedAccount) {
        return {
          status: 'Success',
          data: savedAccount.Users
        };
      }

      return;
    } catch (error) {
      const [err] = catchError(
        'GET SAVED ACCOUNTS saved-account-controller',
        error
      );
      throw err;
    }
  },
  async deleteAccount({ username, userAgent }: DeleteSavedAccountReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const { clientId } = generateClientId(userAgent);
      if (!clientId) {
        console.warn(
          'GET SAVED ACCOUNTS saved-account-controller >> User agent is empty!'
        );

        throw new APIError(
          ErrCode.InvalidArgument,
          'No user-agent data provided!'
        );
      }
      const savedAccount = await model.savedAccount.findByPk(clientId);
      const user = await model.user.findOne({
        where: where(
          fn('lower', col('username')),
          username.trim().toLowerCase()
        )
      });

      if (!savedAccount || !user) {
        console.warn(
          'DELETE ACCOUNT saved-account-controller.ts >>',
          !savedAccount ? 'saved account not found!' : 'user not found!'
        );

        throw new APIError(
          ErrCode.NotFound,
          !savedAccount ? 'saved account not found!' : 'user not found!'
        );
      }
      await savedAccount.destroy();
      await savedAccount.removeUser(user);

      return;
    } catch (error) {
      const [err] = catchError(
        'DELETE ACCOUNT saved-account-controller',
        error
      );

      throw err;
    }
  }
};

export default savedAccountController;
