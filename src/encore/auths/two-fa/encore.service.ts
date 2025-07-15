import modelMiddleware from '../../../middlewares/model-middleware';
import authMiddleware from '../../../middlewares/auth-middleware';
import { Service } from 'encore.dev/service';

const models = Object.values(modelMiddleware);
const refresh = authMiddleware.verifyRefreshToken;
const access = authMiddleware.verifyAccessToken;

export default new Service('two-fa-service', {
  middlewares: [...models, refresh, access]
});
