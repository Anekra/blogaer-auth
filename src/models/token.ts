'use strict';
import { Op } from 'sequelize';
import type { MainModel, Models } from './main-model';
import { DataTypes, Sequelize, Model } from 'sequelize';

interface TokenModel {
  refresh: string;
  access: string;
  userId: string;
  clientId: string;
  loginWith?: string;
  refreshExp?: typeof DataTypes.DATE;
  accessExp?: typeof DataTypes.DATE;
  createdAt?: typeof DataTypes.DATE;
  updatedAt?: typeof DataTypes.DATE;
}

interface Token extends Model<TokenModel>, TokenModel {}

type TokenStatic = typeof Model & {
  new (values?: Record<string, unknown>, options?: any): Token;
  associate: (model: MainModel) => void;
};

const Token = (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const token = sequelize.define<Token>(
    'Token',
    {
      refresh: {
        allowNull: false,
        primaryKey: true,
        unique: true,
        type: dataTypes.STRING
      },
      access: {
        allowNull: false,
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
      loginWith: {
        allowNull: false,
        defaultValue: 'credentials',
        type: dataTypes.STRING
      },
      refreshExp: {
        defaultValue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        type: dataTypes.DATE
      },
      accessExp: {
        defaultValue: new Date(Date.now() + 15 * 60 * 1000),
        type: dataTypes.DATE
      },
      createdAt: {
        type: dataTypes.DATE
      },
      updatedAt: {
        type: dataTypes.DATE
      }
    },
    {
      tableName: 'tokens',
      underscored: true,
      hooks: {
        async afterCreate(attributes, _) {
          console.log(
            `AFTER CREATE token >> userId: ${attributes.userId} has Logged in.`
          );

          const { token } = attributes.sequelize.models as Models;
          if ((await token.count()) > 1) {
            const { count } = await token.findAndCountAll({
              where: { clientId: attributes.clientId }
            });
            if (count > 1) {
              await token.destroy({
                where: {
                  clientId: attributes.clientId,
                  refresh: { [Op.ne]: attributes.refresh }
                }
              });
            }

            const aWeekAgo = new Date();
            aWeekAgo.setDate(aWeekAgo.getDate() - 7);
            token.destroy({
              where: {
                updatedAt: {
                  [Op.lt]: aWeekAgo
                }
              }
            });
          }
        },
        afterDestroy(instance, _) {
          console.log(
            `(userId: ${instance.userId} | clientId: ${instance.clientId}) has Logged out.`
          );
        }
      }
    }
  ) as TokenStatic;

  token.associate = (model: MainModel) => {
    if (model.user) {
      token.belongsTo(model.user, {
        foreignKey: 'user_id',
        targetKey: 'id'
      });
    }
  };

  return token;
};

export default Token;
