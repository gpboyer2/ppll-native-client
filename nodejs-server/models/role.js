/**
 * 角色模型
 * 定义用户角色数据的结构和关联关系
 */
'use strict';

const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class role extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/role` file will call this method automatically.
     */
    static associate(models) {
      // 角色有多个用户
      role.hasMany(models.users, {
        foreignKey: 'role',
        sourceKey: 'code',
        as: 'users'
      });

      // 角色可以关联多个权限（通过permissions字段的JSON数组）
      // 这里不需要定义关联，因为使用JSON字段存储权限ID数组
    }
  }

  role.init({
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '角色名称'
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '角色编码（如：admin、editor）'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '角色描述'
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '权限ID数组（JSON格式）'
    },
    isDefault: {
      type: DataTypes.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
      comment: '是否默认角色（0：否，1：是）'
    },
    status: {
      type: DataTypes.TINYINT(1),
      allowNull: false,
      defaultValue: 1,
      comment: '角色状态（0：禁用，1：启用）'
    },
    remark: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '备注'
    },
    sort: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序权重'
    },
    deleted: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '是否删除'
    },
    created_at: {
      type: DataTypes.DATE,
      field: 'created_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '创建时间'
    },
    updated_at: {
      type: DataTypes.DATE,
      field: 'updated_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '更新时间'
    }
  }, {
    sequelize,
    modelName: 'roles',
    tableName: 'roles',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  // 检查角色编码是否已存在
  role.isCodeTaken = async (code, excludeRoleId) => {
    const existingRole = await role.findOne({
      where: {
        code,
        ...(excludeRoleId && {
          id: {
            [Op.ne]: excludeRoleId
          }
        })
      }
    });
    return !!existingRole;
  }

  // 根据角色编码获取角色信息
  role.getByCode = async (code) => {
    return role.findOne({
      where: {
        code,
        status: 1,
        deleted: { [Op.ne]: 1 }
      }
    });
  }

  // 获取默认角色
  role.getDefaultRole = async () => {
    return role.findOne({
      where: {
        isDefault: 1,
        status: 1,
        deleted: { [Op.ne]: 1 }
      }
    });
  }

  // 检查角色是否有特定权限
  role.hasPermission = function (permissionId) {
    if (!this.permissions || !Array.isArray(this.permissions)) {
      return false;
    }
    return this.permissions.includes(permissionId);
  }

  return role;
};