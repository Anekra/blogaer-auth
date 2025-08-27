import modelMiddleware from '../../middlewares/model-middleware';
import formMiddleware from '../../middlewares/form-middleware';
import { Service } from 'encore.dev/service';

const models = Object.values(modelMiddleware);
const forms = Object.values(formMiddleware);

export default new Service('user-service', {
  middlewares: [...models, ...forms]
});
