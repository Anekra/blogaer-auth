import modelMiddleware from '../../middlewares/model-middleware';
import authMiddleware from '../../middlewares/auth-middleware';
import { Service } from 'encore.dev/service';

const models = Object.values(modelMiddleware);
const auths = Object.values(authMiddleware);

export default new Service('email-service', {
  middlewares: [...models, ...auths]
});
