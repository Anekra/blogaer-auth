import { APIError, ErrCode, middleware } from 'encore.dev/api';

const userMiddleware = {
  verifyAuthor: middleware(
    {
      target: {
        auth: false, // will change to true later
        tags: ['verify-author']
      }
    },
    async (req, next) => {
      const role = req.data.role;
      console.log('VERIFY AUTHOR MW', role);
      if (role.toLowerCase() !== 'author') {
        console.warn(
          'VERIFY ACCESS TOKEN auth-middleware >> User is not an author!'
        );

        throw new APIError(ErrCode.PermissionDenied, 'User is not an author!');
      }

      return await next(req);
    }
  )
};

export default userMiddleware;
