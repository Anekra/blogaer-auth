import { APIError, ErrCode, middleware } from 'encore.dev/api';
import initMainModel from '../models/main-model';
import initInMemModel from '../models/in-memory/in-mem-model';

const modelMiddleware = {
  main: middleware(
    { target: { auth: false, tags: ['main-model'] } },
    async (req, next) => {
      console.log('MAIN MODEL MW'); 
      const model = await initMainModel;
      if (!model) {
        console.warn('MAIN model-middleware >> Database connection failed!');
        throw new APIError(ErrCode.Internal, 'Database connection failed!');
      }
      req.data.mainModel = model;

      return await next(req);
    }
  ),
  memory: middleware(
    { target: { auth: false, tags: ['in-memory-model'] } },
    async (req, next) => {
      const model = await initInMemModel;
      if (!model) {
        console.warn('MEMORY model-middleware >> In memory database connection failed!');
        throw new APIError(
          ErrCode.Internal,
          'In memory database connection failed!'
        );
      }
      req.data.inMemModel = model;

      return await next(req);
    }
  )
};

export default modelMiddleware;
