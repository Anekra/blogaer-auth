'use strict';
import { DataTypes, Model, Sequelize } from 'sequelize';
import { InMemoryModel } from './in-mem-model';

interface TotpSecretModel {
  id?: string;
  userId: string;
  secret: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TotpSecret extends Model<TotpSecretModel>, TotpSecretModel {}

type TotpSecretStatic = typeof Model & {
  new (values?: Record<string, unknown>, options?: any): TotpSecret;
  associate: (model: InMemoryModel) => void;
};

function TotpSecret(sequelize: Sequelize, dataTypes: typeof DataTypes) {
  const totpSecret = sequelize.define<TotpSecret>(
    'TotpSecret',
    {
      id: {
        allowNull: false,
        primaryKey: true,
        unique: true,
        autoIncrement: true,
        type: dataTypes.SMALLINT
      },
      userId: {
        allowNull: false,
        type: dataTypes.UUID
      },
      secret: {
        allowNull: false,
        type: dataTypes.STRING
      },
      createdAt: {
        type: dataTypes.DATE
      },
      updatedAt: {
        type: dataTypes.DATE
      }
    },
    {
      tableName: 'totp_secrets',
      underscored: true
    }
  ) as TotpSecretStatic;

  return totpSecret;
}

export default TotpSecret;
