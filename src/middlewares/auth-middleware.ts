import { APIError, ErrCode, middleware } from 'encore.dev/api';

const authMiddleware = {
  verifyOauthCode: middleware(
    {
      target: {
        auth: false,
        tags: ['verify-oauth-code']
      }
    },
    async (req, next) => {
      const header = req.rawRequest?.headers.authorization;
      if (!header?.startsWith('Oauth2')) {
        console.warn(
          "VERIFY OAUTH CODE auth-middleware >> Auth code doesn't start with Oauth2!"
        );

        throw new APIError(
          ErrCode.PermissionDenied,
          "Auth code doesn't start with Oauth2!"
        );
      }
      const code = header.split(' ')[1];
      if (code === 'undefined') {
        console.warn(
          'VERIFY OAUTH CODE auth-middleware >> Auth code is undefined!'
        );

        throw new APIError(ErrCode.PermissionDenied, 'Auth code is undefined!');
      }
      req.data.oauthCode = code;

      return await next(req);
    }
  )
};

export default authMiddleware;
