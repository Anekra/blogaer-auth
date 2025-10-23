import { APICallMeta, currentRequest } from 'encore.dev';
import {
  AddOrResetPasswordReq,
  PatchAccountReq,
  PatchSettingReq,
  PatchSocialReq
} from '../../../types/request';
import { MainModel } from '../../../models/main-model';
import userFormRequestService from '../service/user-service';
import { CommonStatus, EmailSubject } from '../../../utils/enums';
import { AnyObj, AuthData, Social } from '../../../types';
import { APIError, ErrCode } from 'encore.dev/api';
import UserRequest from '../../../models/user-request';
import { col, fn, Op, where } from 'sequelize';
import UserPasskey from '../../../models/user-passkey';
import UserSetting from '../../../models/user-setting';
import UserTotpSecret from '../../../models/user-totp-secret';
import User from '../../../models/user';
import userService from '../service/user-service';
import { catchError, generateUAId, getAuth } from '../../../utils/helper';
import bcryptjs from 'bcryptjs';

const userController = {
  async getAccount() {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const authData = getAuth();
      const userId = authData.userID;
      const token = await model.token.findByPk(authData.refreshToken, {
        attributes: ['clientId']
      });
      const foundRequests =
        await userFormRequestService.getEmailAndUsernameRequests(
          model,
          userId,
          token?.clientId
        );
      const userFormRequest = {
        emailRequest:
          foundRequests.emailRequest?.status === CommonStatus.Pending,
        usernameRequest:
          foundRequests.usernameRequest?.status === CommonStatus.Pending
      };
      const userSocials = (await model.userSocial.findAll({
        where: { userId },
        attributes: ['social', 'link']
      })) as { social: string; link: string }[];
      const socials = userSocials.reduce((acc, current) => {
        acc[current.social as keyof Social] = current.link;
        return acc;
      }, {} as Social);

      return {
        status: 'Success',
        data: { userFormRequest, socials }
      };
    } catch (error) {
      const [err] = catchError('GET ACCOUNT user-controller', error);
      throw err;
    }
  },
  async patchAccount({
    email,
    username,
    name,
    description,
    picture
  }: PatchAccountReq) {
    const callMeta = currentRequest() as APICallMeta;
    const userFormRequest = callMeta.middlewareData
      ?.userFormRequest as UserRequest;
    const model = callMeta.middlewareData?.mainModel as MainModel;
    try {
      const authData = getAuth();
      const userId = authData.userID;
      if (email) {
        if (userFormRequest) {
          const emailExist = await model.user.findOne({
            where: {
              id: { [Op.ne]: userId },
              email
            }
          });
          if (emailExist) {
            console.warn(
              'PATCH ACCOUNT user-controller >> Email already exists!'
            );

            throw new APIError(ErrCode.AlreadyExists, 'Email already exists!');
          } else {
            await userFormRequest.update({ status: CommonStatus.Success });
          }
        }
      }
      if (username) {
        if (userFormRequest) {
          const payload = (username as string).trim();
          const usernameExist = await model.user.findOne({
            where: {
              [Op.and]: [
                { id: { [Op.ne]: userId } },
                where(fn('lower', col('username')), payload.toLowerCase())
              ]
            }
          });
          if (usernameExist) {
            console.warn(
              'PATCH ACCOUNT user-controller >> Username already exists!'
            );

            throw new APIError(
              ErrCode.AlreadyExists,
              'Username already exists!'
            );
          } else {
            await userFormRequest.update({ status: CommonStatus.Success });
          }
        }
      }
      const [updatedData] = await model.user.update(
        { username, email, name, description, picture },
        { where: { id: userId } }
      );

      if (updatedData === 1) {
        return {
          status: 'Success',
          message: 'User data successfully updated.'
        };
      } else {
        return;
      }
    } catch (error) {
      const [err] = catchError('PATCH ACCOUNT user-controller', error);
      throw err;
    }
  },
  async getSecurity() {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const authData = getAuth();
      const userId = authData.userID;
      const token = await model.token.findByPk(authData.refreshToken, {
        attributes: ['clientId']
      });
      const userJoins = (await model.user.findByPk(userId, {
        attributes: ['password'],
        include: [
          {
            model: model.userPasskey,
            attributes: ['publicKey']
          },
          {
            model: model.userSetting,
            attributes: ['twoFaEnabled', 'twoFaMethod']
          },
          {
            model: model.userTotpSecret,
            attributes: ['userId']
          }
        ]
      })) as User & {
        UserPasskeys: UserPasskey[];
        UserSetting: UserSetting;
        UserTotpSecret: UserTotpSecret;
      };

      const userPasswordExist = userJoins?.password ? true : null;
      const userPasskeys = userJoins?.UserPasskeys;
      const isUserPasskeys = userPasskeys ? userPasskeys.length > 0 : false;
      const isTwoFAEnabled = userJoins?.UserSetting?.twoFaEnabled;
      const twoFAMethod = userJoins?.UserSetting?.twoFaMethod;
      const userSecret = userJoins?.UserTotpSecret;
      const userOauth = await userService.getOauthAssociations(model, userId);

      const emailSubject = userPasswordExist
        ? EmailSubject.ResetPassword
        : EmailSubject.AddPassword;
      const foundRequest = await userService.getFormRequest(
        model,
        userId,
        emailSubject,
        token?.clientId
      );
      const userRequest =
        foundRequest !== null
          ? {
              request: foundRequest?.request,
              limit: foundRequest?.limit.getTime(),
              status: foundRequest?.status
            }
          : null;

      return {
        status: 'Success',
        data: {
          userPassword: userPasswordExist,
          userTwoFA: {
            twoFAMethod: twoFAMethod != null ? twoFAMethod : null,
            isTwoFAEnabled: isTwoFAEnabled != null ? isTwoFAEnabled : null,
            isPasskey: isUserPasskeys ? true : null,
            isAuthApp: userSecret ? true : null
          },
          userOauth,
          userRequest
        }
      };
    } catch (error) {
      const [err] = catchError('GET SECURITY user-controller', error);
      throw err;
    }
  },
  async addOrResetPassword({
    password,
    subject,
    limit,
    userAgent
  }: AddOrResetPasswordReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const authData = getAuth();
      const userId = authData.userID;
      const hashPassword = await bcryptjs.hash(password, 10);
      const [updatedData] = await model.user.update(
        { password: hashPassword },
        {
          where: { id: userId }
        }
      );

      const { uAId } = generateUAId(userAgent);
      if (!uAId) {
        console.warn(
          'ADD OR RESET PASSWORD user-controller >> User agent is invalid!'
        );

        throw new APIError(ErrCode.InvalidArgument, 'User agent is invalid!');
      }
      if (updatedData === 1) {
        await model.userRequest.update(
          { status: CommonStatus.Success },
          { where: { clientId: uAId, request: subject, limit } }
        );

        return;
      } else {
        return;
      }
    } catch (error) {
      const [err] = catchError('ADD OR RESET PASSWORD user-controller', error);
      throw err;
    }
  },
  async getSocial() {
    const callMeta = currentRequest() as APICallMeta;
    const model = callMeta.middlewareData?.mainModel as MainModel;
    try {
      const authData = getAuth();
      const userId = authData.userID;
      const socials = (await model.userSocial.findAll({
        where: { userId },
        attributes: ['social', 'link']
      })) as { social: string; link: string }[];
      const data = socials.reduce(
        (acc, current) => ((acc[current.social] = current.link), acc),
        {} as AnyObj
      );

      return { status: 'Success', data };
    } catch (error) {
      const [err] = catchError('GET SOCIALS user-controller', error);
      throw err;
    }
  },
  async patchSocial({ social, link }: PatchSocialReq) {
    const callMeta = currentRequest() as APICallMeta;
    const model = callMeta.middlewareData?.mainModel as MainModel;
    try {
      const authData = getAuth();
      const userId = authData.userID;
      const [userSocial, isCreated] = await model.userSocial.findOrCreate({
        where: {
          userId,
          social,
          link
        },
        defaults: {
          userId,
          social,
          link
        },
        attributes: ['id']
      });

      if (!isCreated) {
        await model.userSocial.update(
          { social, link },
          { where: { userId: userSocial.id } }
        );
      }

      return {
        status: isCreated ? 'Created' : 'Updated',
        message: isCreated
          ? `Your ${social} link has been added`
          : `Your ${social} link has been updated`
      };
    } catch (error) {
      const [err] = catchError('PATCH SOCIAL user-controller', error);
      throw err;
    }
  },
  async patchSetting({
    twoFaEnabled,
    twoFaMethod,
    preference
  }: PatchSettingReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const authData = getAuth();
      const userId = authData.userID;
      await model.userSetting.update(
        { twoFaEnabled, twoFaMethod, preference },
        { where: { userId } }
      );

      return {
        status: 'Success',
        message: 'Settings successfully updated.'
      };
    } catch (error) {
      const [err] = catchError('PATCH SETTING user-controller', error);
      throw err;
    }
  }
};

export default userController;
