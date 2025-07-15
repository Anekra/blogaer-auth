'use strict';
import type { MainModel } from './main-model';
import { DataTypes, Model, Sequelize } from 'sequelize';
import { getMainModel } from '../utils/helper';
import User from './user';
import UserSetting from './user-setting';
import UserTotpSecret from './user-totp-secret';
import { TwoFAMethod } from '../utils/enums';
import {
  AuthenticatorTransportFuture,
  Base64URLString,
  CredentialDeviceType
} from '@simplewebauthn/server';

interface UserPasskeyModel {
  id: Base64URLString;
  userId: string;
  clientId: string;
  clientBrowser: string;
  clientOs: string;
  isMobile: boolean;
  publicKey: Uint8Array;
  counter: number;
  deviceType: CredentialDeviceType;
  backedUp: boolean;
  transports?: AuthenticatorTransportFuture[];
  createdAt?: string;
  updatedAt?: string;
}

interface UserPasskey extends Model<UserPasskeyModel>, UserPasskeyModel {}

type UserPasskeyStatic = typeof Model & {
  new (values?: Record<string, unknown>, options?: any): UserPasskey;
  associate: (model: MainModel) => void;
};

const UserPasskey = (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const userPasskey = sequelize.define<UserPasskey>(
    'UserPasskey',
    {
      id: {
        allowNull: false,
        primaryKey: true,
        unique: true,
        type: dataTypes.STRING
      },
      userId: {
        allowNull: false,
        type: dataTypes.UUID
      },
      clientId: {
        allowNull: false,
        type: dataTypes.STRING
      },
      clientBrowser: {
        allowNull: false,
        type: dataTypes.STRING
      },
      clientOs: {
        allowNull: false,
        type: dataTypes.STRING
      },
      isMobile: {
        allowNull: false,
        type: dataTypes.BOOLEAN
      },
      publicKey: {
        allowNull: false,
        type: dataTypes.BLOB
      },
      counter: {
        allowNull: false,
        type: dataTypes.INTEGER
      },
      deviceType: {
        allowNull: false,
        type: dataTypes.STRING
      },
      backedUp: {
        allowNull: false,
        type: dataTypes.BOOLEAN
      },
      transports: {
        allowNull: false,
        type: dataTypes.JSON
      },
      createdAt: {
        type: dataTypes.DATE
      },
      updatedAt: {
        type: dataTypes.DATE
      }
    },
    {
      tableName: 'user_passkeys',
      underscored: true,
      hooks: {
        async afterCreate(attributes) {
          console.log(
            `(userId: ${attributes.userId} | clientId: ${attributes.clientId}) passkey has been ADDED.`
          );
          const model = await getMainModel();
          if (!model) return;
          const user = (await model.user.findByPk(attributes.userId, {
            include: [{ model: model.userSetting, attributes: ['twoFaMethod'] }]
          })) as User & {
            UserSetting: UserSetting;
          };

          if (!user.UserSetting.twoFaMethod) {
            model.userSetting.update(
              { twoFaMethod: TwoFAMethod.Passkey },
              { where: { userId: attributes.userId } }
            );
          }
        },
        async afterDestroy(instance, _) {
          console.log(
            `(userId: ${instance.userId} | clientId: ${instance.clientId}) passkey has been DELETED.`
          );
          const model = await getMainModel();
          if (!model) return;
          const user = (await model.user.findByPk(instance.userId, {
            include: [{ model: model.userTotpSecret }]
          })) as User & {
            UserTotpSecret: UserTotpSecret;
          };
          if (user.UserTotpSecret) {
            await model.userSetting.update(
              { twoFaMethod: TwoFAMethod.App },
              { where: { userId: instance.userId } }
            );
          } else {
            await model.userSetting.update(
              { twoFaMethod: null },
              { where: { userId: instance.userId } }
            );
          }
        }
      }
    }
  ) as UserPasskeyStatic;

  userPasskey.associate = (model: MainModel) => {
    if (model.user) {
      userPasskey.belongsTo(model.user, {
        foreignKey: 'user_id',
        targetKey: 'id'
      });
    }
  };

  return userPasskey;
};

export default UserPasskey;
