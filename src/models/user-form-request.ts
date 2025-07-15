'use strict';
import { CommonStatus } from '../utils/enums';
import type { MainModel } from './main-model';
import { DataTypes, Model, Sequelize } from 'sequelize';

interface UserFormRequestModel {
  id?: number;
  userId: string;
  clientId: string;
  request: string;
  limit: Date;
  status: CommonStatus;
  otp?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserFormRequest
  extends Model<UserFormRequestModel>,
    UserFormRequestModel {}

type UserFormRequestStatic = typeof Model & {
  new (values?: Record<string, unknown>, options?: any): UserFormRequest;
  associate: (model: MainModel) => void;
};

const UserFormRequest = (sequelize: Sequelize, dataTypes: typeof DataTypes) => {
  const userFormRequest = sequelize.define<UserFormRequest>(
    'UserFormRequest',
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
      clientId: {
        allowNull: false,
        type: dataTypes.STRING
      },
      request: {
        allowNull: false,
        type: dataTypes.STRING
      },
      limit: {
        allowNull: false,
        type: dataTypes.DATE
      },
      status: {
        allowNull: false,
        type: dataTypes.STRING
      },
      otp: {
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
      tableName: 'user_form_request',
      underscored: true
    }
  ) as UserFormRequestStatic;

  userFormRequest.associate = (model: MainModel) => {
    if (model.user) {
      userFormRequest.belongsTo(model.user, {
        foreignKey: 'user_id',
        targetKey: 'id'
      });
    }
  };

  return userFormRequest;
};

export default UserFormRequest;
