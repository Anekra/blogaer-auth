import modelMiddleware from '../../../middlewares/model-middleware';
import authMiddleware from '../../../middlewares/auth-middleware';
import { Service } from 'encore.dev/service';

const model = modelMiddleware.main;
const auth = authMiddleware.verifyRefreshToken;

export default new Service('auth-service', {
  middlewares: [model, auth]
});
