import { APICallMeta, currentRequest } from 'encore.dev';
import emailService from '../service/email-service';
import {
  GetUpdateEmailOtpTime,
  SendAddPasswordLinkReq as SendEmailLinkReq,
  SendUpdateEmailOtpReq
} from '../../../types/request';
import type { MainModel } from '../../../models/main-model';
import { EmailSubject } from '../../../utils/enums';
import {
  catchError,
  generateUAId,
  generateOtp,
  getAuth
} from '../../../utils/helper';
import { APIError, ErrCode } from 'encore.dev/api';

const emailController = {
  async sendAddPasswordLink({ origin }: SendEmailLinkReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const authData = getAuth();
      const userId = authData.userID;
      const { email, limit, html } = await emailService.handleEmailReqForm(
        EmailSubject.AddPassword,
        userId,
        authData.refreshToken,
        model,
        origin
      );
      const info = await emailService.sendEmail(
        email,
        'Add password request',
        html
      );

      return { status: 'Success', data: { info, limit } };
    } catch (error) {
      const [err] = catchError(
        'SEND ADD PASSWORD LINK email-controller',
        error
      );

      throw err;
    }
  },
  async sendResetPasswordLink({ origin }: SendEmailLinkReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const authData = getAuth();
      const userId = authData.userID;
      const { email, limit, html } = await emailService.handleEmailReqForm(
        EmailSubject.ResetPassword,
        userId,
        authData.refreshToken,
        model,
        origin
      );
      const info = await emailService.sendEmail(
        email,
        'Reset password request',
        html
      );

      return { status: 'Success', data: { info, limit } };
    } catch (error) {
      const [err] = catchError(
        'SEND RESET PASSWORD LINK email-controller',
        error
      );

      throw err;
    }
  },
  async sendUpdateEmailLink({ origin }: SendEmailLinkReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const authData = getAuth();
      const userId = authData.userID;
      const { email, limit, html } = await emailService.handleEmailReqForm(
        EmailSubject.UpdateEmail,
        userId,
        authData.refreshToken,
        model,
        origin
      );
      const info = await emailService.sendEmail(
        email,
        'Change email request',
        html
      );

      return { status: 'Success', data: { info, limit } };
    } catch (error) {
      const [err] = catchError(
        'SEND UPDATE EMAIL LINK email-controller',
        error
      );

      throw err;
    }
  },
  async sendUpdateUsernameLink({ origin }: SendEmailLinkReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const authData = getAuth();
      const userId = authData.userID;
      const { email, limit, html } = await emailService.handleEmailReqForm(
        EmailSubject.UpdateUsername,
        userId,
        authData.refreshToken,
        model,
        origin
      );
      const info = await emailService.sendEmail(
        email,
        'Change username request',
        html
      );

      return { status: 'Success', data: { info, limit } };
    } catch (error) {
      const [err] = catchError(
        'SEND UPDATE USERNAME LINK email-controller',
        error
      );

      throw err;
    }
  },
  async sendUpdateEmailOtp({ email, request, limit }: SendUpdateEmailOtpReq) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const authData = getAuth();
      const userId = authData.userID;
      const user = await model.user.findByPk(userId, {
        attributes: ['id']
      });
      if (!user?.id) {
        console.log('emailController.ts', 'No user found!');
        throw new CustomError(404, {
          status: 'Not found',
          error: 'User not found!'
        });
      }

      const otp = generateOtp();
      const html = emailService.createOtpHtml(otp);
      const date = new Date(Number(limit));
      const foundRequest = await model.userFormRequest.findOne({
        where: { userId: user.id, request, limit: date }
      });
      const updated = await foundRequest?.update({ otp });
      if (updated?.updatedAt) {
        const info = await emailService.sendEmail(
          email,
          'Change email request verification otp',
          html
        );

        return { status: 'Success', data: { info } };
      } else {
        console.warn(
          'SEND UPDATE EMAIL OTP email-controller >> User request do not exist!'
        );

        throw new APIError(ErrCode.NotFound, 'User request do not exist!');
      }
    } catch (error) {
      const [err] = catchError('SEND UPDATE EMAIL OTP email-controller', error);
      throw err;
    }
  },
  async getUpdateEmailOtpTime({
    request,
    limit,
    userAgent
  }: GetUpdateEmailOtpTime) {
    try {
      const callMeta = currentRequest() as APICallMeta;
      const model = callMeta.middlewareData?.mainModel as MainModel;
      const authData = getAuth();
      const userId = authData.userID;
      const { uAId } = generateUAId(userAgent);
      if (!uAId) {
        console.warn(
          'GET UPDATE EMAIL OTP TIME email-controller >> User agent is invalid!'
        );

        throw new APIError(ErrCode.InvalidArgument, 'User agent is invalid!');
      }
      const foundRequest = await model.userFormRequest.findOne({
        where: {
          userId,
          clientId: uAId,
          request: `${request}`,
          limit: new Date(Number(limit))
        }
      });

      if (foundRequest?.updatedAt && foundRequest?.otp) {
        const time = new Date(
          foundRequest.updatedAt.getTime() + 5 * 60 * 1000
        ).getTime();

        return { status: 'Success', data: { time } };
      } else {
        console.warn(
          'GET UPDATE EMAIL OTP TIME email-controller >> Request not found!'
        );

        throw new APIError(ErrCode.NotFound, 'Request not found!');
      }
    } catch (error) {
      const [err] = catchError(
        'GET UPDATE EMAIL OTP TIME email-controller',
        error
      );
      throw error;
    }
  }
};

export default emailController;
