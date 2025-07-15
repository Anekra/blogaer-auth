import { DataTypes, Sequelize } from 'sequelize';
import WebAuthnRegisterOptions from './webauthn-register-option';
import WebAuthnLoginOptions from './webauthn-login-option';
import TotpSecret from './totp-secret';

export type InMemoryModel = {
  webAuthnRegisterOption: ReturnType<typeof WebAuthnRegisterOptions>;
  webAuthnLoginOption: ReturnType<typeof WebAuthnLoginOptions>;
  totpSecret: ReturnType<typeof TotpSecret>;
  dataTypes: typeof DataTypes;
  sequelize: Sequelize;
};

let inMemModel: InMemoryModel | null = null;

async function initInMemModel() {
  if (inMemModel != null) return inMemModel;

  const sequelize = new Sequelize({
    database: 'temp',
    dialect: 'sqlite',
    storage: ':memory:',
    pool: { max: 1, idle: 60000, maxUses: Infinity },
    logging: false
  });
  try {
    inMemModel = {
      webAuthnRegisterOption: WebAuthnRegisterOptions(sequelize, DataTypes),
      webAuthnLoginOption: WebAuthnLoginOptions(sequelize, DataTypes),
      totpSecret: TotpSecret(sequelize, DataTypes),
      dataTypes: DataTypes,
      sequelize
    };
    await inMemModel.sequelize.sync({ force: true });
    Object.values(inMemModel).forEach((model) => {
      if ('associate' in model && inMemModel) {
        model.associate(inMemModel);
      }
    });
  } catch (error) {
    console.error('Error initializing in-memory database:', error);
  }
}

export default initInMemModel();
