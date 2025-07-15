import { MainModel } from '../../../models/main-model';
import { Op } from 'sequelize';
import { CommonStatus, EmailSubject } from '../../../utils/enums';
import { AnyObj } from '../../../types';

const userService = {
  async getFormRequest(
    model: MainModel,
    userId: string,
    request: EmailSubject,
    clientId?: string
  ) {
    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const userFormRequest = await model.userFormRequest.findOne({
      where: {
        userId,
        clientId,
        request,
        createdAt: { [Op.gte]: twentyFourHoursAgo }
      },
      order: [['createdAt', 'DESC']]
    });

    if (userFormRequest) {
      const limit = new Date(userFormRequest.limit).getTime();
      if (userFormRequest.status === CommonStatus.Pending && now > limit) {
        await userFormRequest.update({ status: CommonStatus.Expired });
      }
    }

    return userFormRequest;
  },
  async getEmailAndUsernameRequests(
    model: MainModel,
    userId: string,
    clientId?: string
  ) {
    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const emailRequest = await model.userFormRequest.findOne({
      where: {
        userId,
        clientId,
        request: EmailSubject.UpdateEmail,
        createdAt: { [Op.gte]: twentyFourHoursAgo }
      },
      order: [['createdAt', 'DESC']]
    });
    const usernameRequest = await model.userFormRequest.findOne({
      where: {
        userId,
        clientId,
        request: EmailSubject.UpdateUsername,
        createdAt: { [Op.gte]: twentyFourHoursAgo }
      },
      order: [['createdAt', 'DESC']]
    });
    if (emailRequest) {
      const limit = new Date(emailRequest.limit).getTime();
      if (emailRequest.status === CommonStatus.Pending && now > limit) {
        await emailRequest.update({ status: CommonStatus.Expired });
      }
    }
    if (usernameRequest) {
      const limit = new Date(usernameRequest.limit).getTime();
      if (usernameRequest.status === CommonStatus.Pending && now > limit) {
        await usernameRequest.update({ status: CommonStatus.Expired });
      }
    }

    return { emailRequest, usernameRequest };
  },
  async getOauthAssociations(model: MainModel, userId: string) {
    const associations = (await model.userOauth.findAll({
      where: { userId },
      attributes: ['oauthProvider', 'oauthEmail']
    })) as { oauthProvider: string; oauthEmail: string }[];
    const data = associations.reduce(
      (acc, current) => (
        (acc[current.oauthProvider.toLowerCase()] = current.oauthEmail), acc
      ),
      {} as AnyObj
    );

    return data;
  }
};

export default userService;
