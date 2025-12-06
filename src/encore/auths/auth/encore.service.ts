import { Service } from 'encore.dev/service';
import authMiddleware from '../../../middlewares/auth-middleware';
import modelMiddleware from '../../../middlewares/model-middleware';

const model = modelMiddleware.main;
const cacheControl = authMiddleware.logoutCacheControl;

export default new Service('auth-service', {
	middlewares: [model, cacheControl]
});
