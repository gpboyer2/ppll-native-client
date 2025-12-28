const httpStatus = require('http-status');
const ApiError = require('../utils/api-error');
const db = require("../models");


class Service {
  constructor(options) {
    this.options = options;
    this.table = db[options.name];
  }

  async createOne(params) {
    const user = Object.assign({}, {
      password: Date.now(),
      active: 0,
      status: 0,
      deleted: 0
    }, params);

    const [row, created] = await this.table.findOrCreate({
      where: { username: user.apiKey },
      defaults: user,
    });

    if (created) {
      return row;
    }

    return null;
  }

  async deleteOne(id) {
    try {
      const row = await this.table.findByPk(id);
      if (!row) return null;
      await row.destroy();
      return row;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, error);
    }
  };

  async updateOne(id, updateBody) {
    try {
      const user = Object.assign({}, updateBody);

      for (const key in user) {
        if (Object.hasOwnProperty.call(user, key)) {
          const element = user[key];
          if (element === null || element === undefined) delete user[key];
        }
      }

      const row = await this.table.update(user, {
        where: { id: id },
      });

      return row;
    } catch (error) {
      if (error instanceof ApiError) throw error; // 如果错误已经是ApiError，直接抛出，避免覆盖具体错误信息
      throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, error);
    }
  };

  async getOne(field) {
    return this.table.findOne({ where: field });
  }

  async getAll(field) {
    return this.table.findAll({ where: field });
  }
}

module.exports = Service;
