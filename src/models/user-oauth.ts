'use strict';
import type { MainModel } from './main-model';
import { DataTypes, Model, Sequelize } from 'sequelize';

interface UserOauthModel {
  id?: number;
  userId: string;
  oauthProvider: string;
  oauthEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UserOauth extends Model<UserOauthModel>, UserOauthModel {}

type UserOauthStatic = typeof Model & {
  new (values?: Record<string, unknown>, options?: any): UserOauth;
  associate: (model: MainModel) => void;
};

const UserOauth = (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const userOauth = sequelize.define<UserOauth>(
    'UserOauth',
    {
      id: {
        allowNull: false,
        primaryKey: true,
        unique: true,
        autoIncrement: true,
        type: dataTypes.INTEGER
      },
      userId: {
        allowNull: false,
        type: dataTypes.UUID
      },
      oauthProvider: {
        allowNull: false,
        type: dataTypes.STRING
      },
      oauthEmail: {
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
      tableName: 'user_oauth2',
      underscored: true,
      hooks: {
        afterCreate: (userOauth) => {
          console.log(
            `(provider: ${userOauth.oauthProvider} | email: ${userOauth.oauthEmail}) oauth provider has been ADDED.`
          );
        }
      }
    }
  ) as UserOauthStatic;

  userOauth.associate = (model: MainModel) => {
    if (model.user) {
      userOauth.belongsTo(model.user, {
        foreignKey: 'user_id',
        targetKey: 'id'
      });
    }
  };

  return userOauth;
};

export default UserOauth;
