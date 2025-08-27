import modelMiddleware from '../../../middlewares/model-middleware';
import { Service } from 'encore.dev/service';

const models = Object.values(modelMiddleware);

export default new Service('two-fa-service', {
  middlewares: [...models]
});
