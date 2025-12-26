/**
 * 权限模型
 * 定义权限数据的结构和关联关系，支持树形结构和多种权限类型
 */
'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class permissions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/permissions` file will call this method automatically.
     */
    static associate(models) {
      // 自关联：父子权限关系
      permissions.belongsTo(permissions, {
        foreignKey: 'parentId',
        as: 'parent',
        targetKey: 'id'
      });

      permissions.hasMany(permissions, {
        foreignKey: 'parentId',
        as: 'children',
        sourceKey: 'id'
      });
    }
  }

  permissions.init({
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '权限名称'
    },
    code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: '权限编码（如：user:create）'
    },
    type: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '权限类型：1-菜单，2-按钮，3-API'
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: '父权限ID（0为顶级权限）'
    },
    path: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '前端路由路径（菜单类型时）'
    },
    icon: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '图标（菜单类型时）'
    },
    component: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '组件路径（菜单类型时）'
    },
    method: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'HTTP方法（API类型时）'
    },
    url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'API地址（API类型时）'
    },
    sort: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序权重'
    },
    status: {
      type: DataTypes.TINYINT(1),
      allowNull: false,
      defaultValue: 1,
      comment: '权限状态（0：禁用，1：启用）'
    },
    isShow: {
      type: DataTypes.TINYINT(1),
      allowNull: false,
      defaultValue: 1,
      comment: '是否显示在菜单（0：否，1：是）'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '权限描述'
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
    modelName: 'permissions',
    tableName: 'permissions',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  // 检查权限编码是否已存在
  permissions.isCodeTaken = async (code, excludePermissionId) => {
    const { Op } = require('sequelize');
    const existingPermission = await permissions.findOne({
      where: {
        code,
        ...(excludePermissionId && {
          id: {
            [Op.ne]: excludePermissionId
          }
        })
      }
    });
    return !!existingPermission;
  };

  // 根据权限编码获取权限信息
  permissions.getByCode = async (code) => {
    return permissions.findOne({
      where: {
        code,
        status: 1
      }
    });
  };

  // 根据权限类型获取权限列表
  permissions.getByType = async (type) => {
    return permissions.findAll({
      where: {
        type,
        status: 1
      },
      order: [['sort', 'ASC'], ['created_at', 'DESC']]
    });
  };

  // 获取树形权限结构
  permissions.getTreeStructure = async (parentId = 0) => {
    const permissions_list = await permissions.findAll({
      where: {
        parentId,
        status: 1
      },
      order: [['sort', 'ASC']]
    });

    const result = [];
    for (const permission of permissions_list) {
      const item = permission.toJSON();
      const children = await permissions.getTreeStructure(item.id);
      if (children.length > 0) {
        item.children = children;
      }
      result.push(item);
    }

    return result;
  };

  // 获取用户的权限树（根据权限ID列表）
  permissions.getUserPermissionTree = async (permissionIds) => {
    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      return [];
    }

    const { Op } = require('sequelize');
    const allPermissions = await permissions.findAll({
      where: {
        id: {
          [Op.in]: permissionIds
        },
        status: 1
      },
      order: [['sort', 'ASC']]
    });

    // 构建树形结构
    const buildTree = (permissions, parentId = 0) => {
      const children = permissions.filter(p => p.parentId === parentId);
      return children.map(child => {
        const item = child.toJSON();
        const subChildren = buildTree(permissions, child.id);
        if (subChildren.length > 0) {
          item.children = subChildren;
        }
        return item;
      });
    };

    return buildTree(allPermissions);
  };

  return permissions;
};