import { api } from 'encore.dev/api';
import savedAccountController from '../../controllers/saved-account-controller';
import { DeleteSavedAccountReq, UAReq } from '../../../../../types/request';

export const getSavedAccounts = api<UAReq>(
  {
    method: 'GET',
    path: '/auth-service/v1/saved-accounts',
    expose: true,
    tags: ['main-model']
  },
  savedAccountController.getSavedAccounts
);

export const deleteSavedAccount = api<DeleteSavedAccountReq>(
  {
    method: 'DELETE',
    path: '/auth-service/v1/saved-accounts/:username',
    expose: true,
    tags: ['main-model']
  },
  savedAccountController.deleteAccount
);
