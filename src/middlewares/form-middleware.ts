import { APIError, ErrCode, middleware } from 'encore.dev/api';
import { MainModel } from '../models/main-model';
import { generateClientId, parseJsonBody } from '../utils/helper';

type ParsedPayload = {
  otp: string;
  request: string;
  limit: number;
}

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

      const { otp, request, limit } = req.requestMeta?.parsedPayload as ParsedPayload;
      const model = req.data.mainModel as MainModel;
      const { clientId } = generateClientId(
        req.rawRequest.headers['user-agent']
      );
      if (!clientId) {
        console.warn(
          'VERIFY REQUEST FORM OTP form-middleware >> User agent is invalid!'
        );

        throw new APIError(ErrCode.InvalidArgument, 'User agent is invalid!');
      }
      const foundRequest = await model.userFormRequest.findOne({
        where: {
          userId: req.data.userId,
          clientId,
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

      const { request, limit } = await parseJsonBody(req.rawRequest);
      const model = req.data.mainModel as MainModel;
      const { clientId } = generateClientId(
        req.rawRequest.headers['user-agent']
      );
      if (!clientId) {
        console.warn(
          'VERIFY REQUEST FORM user-middleware >> User agent is invalid!'
        );

        throw new APIError(ErrCode.InvalidArgument, 'User agent is invalid!');
      }
      const foundRequest = await model.userFormRequest.findOne({
        where: {
          userId: req.data.userId,
          clientId,
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
