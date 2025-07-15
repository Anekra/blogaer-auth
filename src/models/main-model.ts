'use strict';
import { DataTypes, Dialect, Sequelize } from 'sequelize';
import sequelizeConfig from '../config/sequelize';
import User from './user';
import UserRole from './user-role';
import RefreshToken from './refresh-token';
import UserOauth from './user-oauth';
import UserSocial from './user-social';
import UserPasskey from './user-passkey';
import UserSetting from './user-setting';
import UserTotpSecret from './user-totp-secret';
import SavedAccount from './saved-account';
import UserFormRequest from './user-form-request';

export type MainModel = {
  refreshToken: ReturnType<typeof RefreshToken>;
  savedAccount: ReturnType<typeof SavedAccount>;
  user: ReturnType<typeof User>;
  userRole: ReturnType<typeof UserRole>;
  userOauth: ReturnType<typeof UserOauth>;
  userSocial: ReturnType<typeof UserSocial>;
  userPasskey: ReturnType<typeof UserPasskey>;
  userTotpSecret: ReturnType<typeof UserTotpSecret>;
  userSetting: ReturnType<typeof UserSetting>;
  userFormRequest: ReturnType<typeof UserFormRequest>;
  dataTypes: typeof DataTypes;
  sequelize: Sequelize;
};

let mainModel: MainModel | null = null;

async function dbConnect(sequelize: Sequelize, retries = 0) {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Connected to Sqlite database ✔✔✔');
  } catch (error) {
    console.error(
      'Failed to connect to Sqlite database:',
      retries < 5 ? 'Retrying in 60 seconds.' : 'Max retries have been reached.'
    );
    if (retries >= 5) {
      console.error('Failed to connect to MySQL after 5 attempts ✖✖✖');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 60000));

    return dbConnect(sequelize, retries + 1);
  }
}

async function initMainModel() {
  if (mainModel != null) return mainModel;

  const config = sequelizeConfig.development;
  const sequelize = new Sequelize({
    username: config.username,
    password: config.password,
    database: config.database,
    dialect: config.dialect as Dialect,
    host: config.host,
    storage: config.storage,
    logging: false
  });

  await dbConnect(sequelize);

  mainModel = {
    refreshToken: RefreshToken(sequelize, DataTypes),
    savedAccount: SavedAccount(sequelize, DataTypes),
    user: User(sequelize, DataTypes),
    userRole: UserRole(sequelize, DataTypes),
    userOauth: UserOauth(sequelize, DataTypes),
    userSocial: UserSocial(sequelize, DataTypes),
    userPasskey: UserPasskey(sequelize, DataTypes),
    userTotpSecret: UserTotpSecret(sequelize, DataTypes),
    userSetting: UserSetting(sequelize, DataTypes),
    userFormRequest: UserFormRequest(sequelize, DataTypes),
    dataTypes: DataTypes,
    sequelize
  };
  Object.values(mainModel).forEach((model) => {
    if ('associate' in model && mainModel) {
      model.associate(mainModel);
    }
  });

  return mainModel;
}

export default initMainModel();
