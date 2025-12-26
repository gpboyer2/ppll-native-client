'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BannedIP extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/banned-ip` file will call this method automatically.
     */
    static associate(models) {
      // 可以关联到用户表，表示谁创建的封禁记录
      if (models.users) {
        BannedIP.belongsTo(models.users, {
          foreignKey: 'created_by',
          as: 'creator'
        });
      }
    }

    /**
     * 检查IP是否已过期
     * @returns {boolean} 是否已过期
     */
    isExpired() {
      return this.expiresAt < new Date();
    }

    /**
     * 根据IP查找封禁记录
     * @param {string} ip - IP地址
     * @returns {Promise<BannedIP|null>} 封禁记录
     */
    static async findByIp(ip) {
      return await this.findOne({
        where: { ip }
      });
    }

    /**
     * 检查IP是否被封禁
     * @param {string} ip - IP地址
     * @returns {Promise<boolean>} 是否被封禁
     */
    static async isIpBanned(ip) {
      const { Op } = require('sequelize');
      const bannedRecord = await this.findOne({
        where: {
          ip,
          expiresAt: {
            [Op.gt]: new Date()
          },
          status: 1
        }
      });
      return !!bannedRecord;
    }

    /**
     * 封禁IP地址
     * @param {string} ip - IP地址
     * @param {string} reason - 封禁原因
     * @param {number} createdBy - 创建者用户ID
     * @param {string} remark - 备注
     * @returns {Promise<BannedIP>} 封禁记录
     */
    static async banIP(ip, reason, createdBy = 0, remark = '') {
      const { Op } = require('sequelize');

      // 检查是否已存在封禁记录
      const existingRecord = await this.findOne({
        where: { ip }
      });

      // 计算永久封禁的过期时间（例如：100年后）
      const permanentExpiresAt = new Date();
      permanentExpiresAt.setFullYear(permanentExpiresAt.getFullYear() + 100);

      if (existingRecord) {
        // 如果已存在，更新封禁信息
        await existingRecord.update({
          reason,
          bannedAt: new Date(),
          expiresAt: permanentExpiresAt, // 永久封禁
          createdBy,
          status: 1,
          remark
        });
        return existingRecord;
      } else {
        // 创建新的封禁记录
        return await this.create({
          ip,
          reason,
          bannedAt: new Date(),
          expiresAt: permanentExpiresAt, // 永久封禁
          createdBy,
          status: 1,
          remark
        });
      }
    }

    /**
     * 解除IP封禁
     * @param {string} ip - IP地址
     * @returns {Promise<boolean>} 是否成功解除
     */
    static async unbanIP(ip) {
      const record = await this.findOne({
        where: { ip, status: 1 }
      });

      if (record) {
        await record.update({
          status: 0,
          expiresAt: new Date()
        });
        return true;
      }
      return false;
    }

    /**
     * 清理过期的封禁记录
     * @returns {Promise<number>} 清理的记录数量
     */
    static async cleanupExpiredRecords() {
      const { Op } = require('sequelize');
      const result = await this.update(
        { status: 0 },
        {
          where: {
            expiresAt: {
              [Op.lt]: new Date()
            },
            status: 1
          }
        }
      );
      return result[0];
    }
  }

  BannedIP.init({
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      comment: '主键ID'
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true,
      comment: '被封禁的IP地址'
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '封禁原因'
    },
    bannedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'banned_at',
      defaultValue: DataTypes.NOW,
      comment: '封禁时间'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
      comment: '过期时间'
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'created_by',
      defaultValue: 0,
      comment: '创建者用户ID'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '状态(0:已解除,1:生效中)'
    },
    remark: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '备注'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: DataTypes.NOW,
      comment: '创建时间'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
      defaultValue: DataTypes.NOW,
      comment: '更新时间'
    }
  }, {
    sequelize,
    modelName: 'banned_ips',
    tableName: 'banned_ips',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return BannedIP;
};
