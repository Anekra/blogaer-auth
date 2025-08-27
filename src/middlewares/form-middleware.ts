import { APIError, ErrCode, middleware } from 'encore.dev/api';
import { MainModel } from '../models/main-model';
import { generateUAId, parseJsonBody } from '../utils/helper';
import { APICallMeta } from 'encore.dev';

type FormOtpPayload = {
  otp: string;
  request: string;
  limit: number;
};

type FormPayload = {
  otp: string;
  request: string;
  limit: number;
};

const formMiddleware = {
  verifyRequestFormOtp: middleware(
    {
      target: {
        auth: true,
        tags: ['verify-request-form-otp']
      }
    },
    async (req, next) => {
      if (!req.rawRequest) {
        console.warn(
          'VERIFY REQUEST FORM OTP form-middleware >> Request is missing rawRequest!'
        );

        throw new APIError(
          ErrCode.InvalidArgument,
          'Request is missing rawRequest!'
        );
      }

      const requestMeta = req.requestMeta as APICallMeta;
      const { otp, request, limit } =
        requestMeta.parsedPayload as FormOtpPayload;
      const model = req.data.mainModel as MainModel;
      const { uAId } = generateUAId(
        requestMeta.headers['user-agent'] as string
      );
      if (!uAId) {
        console.warn(
          'VERIFY REQUEST FORM OTP form-middleware >> User agent is invalid!'
        );

        throw new APIError(ErrCode.InvalidArgument, 'User agent is invalid!');
      }
      const foundRequest = await model.userFormRequest.findOne({
        where: {
          userId: req.data.userId,
          clientId: uAId,
          request,
          limit: new Date(Number(limit)),
          otp
        }
      });
      if (foundRequest?.updatedAt) {
        const now = Date.now();
        const hasExpired = now > foundRequest.limit.getTime();
        if (hasExpired) {
          console.warn(
            'VERIFY REQUEST FORM OTP form-middleware >> Request form has expired!'
          );

          throw new APIError(
            ErrCode.DeadlineExceeded,
            'Request form has expired!'
          );
        }

        const hasPassed5Min =
          Date.now() - foundRequest.updatedAt.getTime() > 5 * 60 * 1000;
        if (hasPassed5Min) {
          console.warn(
            'VERIFY REQUEST FORM OTP form-middleware >> Otp has passed 5 minutes timer!'
          );

          throw new APIError(
            ErrCode.DeadlineExceeded,
            'Otp has passed 5 minutes timer!'
          );
        } else {
          req.data.userFormRequest = foundRequest;
          return await next(req);
        }
      } else {
        throw new APIError(ErrCode.NotFound, 'Otp does not match!');
      }
    }
  ),
  verifyRequestForm: middleware(
    {
      target: {
        auth: true,
        tags: ['verify-request-form']
      }
    },
    async (req, next) => {
      if (!req.rawRequest) {
        console.warn(
          'VERIFY REQUEST FORM form-middleware >> Request is missing rawRequest!'
        );

        throw new APIError(
          ErrCode.InvalidArgument,
          'Request is missing rawRequest!'
        );
      }

      const requestMeta = req.requestMeta as APICallMeta;
      const { request, limit } = requestMeta.parsedPayload as FormPayload;
      const model = req.data.mainModel as MainModel;
      const { uAId } = generateUAId(
        requestMeta.headers['user-agent'] as string
      );
      if (!uAId) {
        console.warn(
          'VERIFY REQUEST FORM user-middleware >> User agent is invalid!'
        );

        throw new APIError(ErrCode.InvalidArgument, 'User agent is invalid!');
      }
      const foundRequest = await model.userFormRequest.findOne({
        where: {
          userId: req.data.userId,
          clientId: uAId,
          request,
          limit: new Date(Number(limit))
        }
      });
      if (foundRequest) {
        const now = Date.now();
        const hasExpired = now > foundRequest.limit.getTime();
        if (hasExpired) {
          console.warn(
            'VERIFY REQUEST FORM user-middleware >> Request form has expired!'
          );

          throw new APIError(
            ErrCode.DeadlineExceeded,
            'Request form has expired!'
          );
        } else {
          req.data.userFormRequest = foundRequest;
          return await next(req);
        }
      } else {
        console.warn(
          'VERIFY REQUEST FORM user-middleware >> Otp does not match!'
        );

        throw new APIError(ErrCode.NotFound, 'Otp does not match!');
      }
    }
  )
};

export default formMiddleware;
