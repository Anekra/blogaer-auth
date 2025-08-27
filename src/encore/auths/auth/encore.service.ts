import modelMiddleware from '../../../middlewares/model-middleware';
import { Service } from 'encore.dev/service';

const model = modelMiddleware.main;

export default new Service('auth-service', {
  middlewares: [model]
});
