'use strict';
import { getMainModel } from '../utils/helper';
import type { MainModel } from './main-model';
import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user';
import UserSetting from './user-setting';
import { TwoFAMethod } from '../utils/enums';
import UserPasskey from './user-passkey';

interface UserTotpSecretModel {
  id?: number;
  userId: string;
  secret: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UserTotpSecret
  extends Model<UserTotpSecretModel>,
    UserTotpSecretModel {}

type UserTotpSecretStatic = typeof Model & {
  new (values?: Record<string, unknown>, options?: any): UserTotpSecret;
  associate: (model: MainModel) => void;
};

const UserTotpSecret = (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const userTotpSecret = sequelize.define<UserTotpSecret>(
    'UserTotpSecret',
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
      tableName: 'user_totp_secrets',
      underscored: true,
      hooks: {
        async afterCreate(attributes) {
          console.log(`(userId: ${attributes.userId}) TOTP has been ADDED.`);
          const model = await getMainModel();
          if (!model) {
            console.log('Database connection failed!');
            return;
          }
          const user = (await model.user.findByPk(attributes.userId, {
            include: [{ model: model.userSetting, attributes: ['twoFaMethod'] }]
          })) as User & {
            UserSetting: UserSetting;
          };

          if (!user.UserSetting.twoFaMethod) {
            model.userSetting.update(
              { twoFaMethod: TwoFAMethod.App },
              { where: { userId: attributes.userId } }
            );
          }
        },
        async afterDestroy(instance, _) {
          console.log(`(userId: ${instance.userId}) TOTP has been DELETED.`);
          const model = await getMainModel();
          if (!model) {
            console.log('Database connection failed!');
            return;
          }
          const user = (await model.user.findByPk(instance.userId, {
            include: [{ model: model.userPasskey }]
          })) as User & {
            UserPasskeys: UserPasskey[];
          };
          if (user.UserPasskeys && user.UserPasskeys.length > 0) {
            await model.userSetting.update(
              { twoFaMethod: TwoFAMethod.Passkey },
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
  ) as UserTotpSecretStatic;

  userTotpSecret.associate = (model: MainModel) => {
    if (model.user) {
      userTotpSecret.belongsTo(model.user, {
        foreignKey: 'user_id',
        targetKey: 'id'
      });
    }
  };

  return userTotpSecret;
};

export default UserTotpSecret;
