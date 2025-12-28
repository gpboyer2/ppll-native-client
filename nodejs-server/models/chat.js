'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Chat extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/chat` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }

  Chat.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
      comment: '主键ID'
    },
    chatname: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '聊天名称'
    },
    apiKey: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'API密钥'
    },
    message: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '消息内容'
    },
    active: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '是否激活'
    },
    deleted: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '是否删除'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: '创建时间'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: '更新时间'
    }
  }, {
    sequelize,
    modelName: 'chats',
    tableName: 'chats',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Chat.isEmailTaken = async (apiKey, excludeChatId) => {
    const chatRecord = await Chat.findOne({
      where: {
        apiKey,
        chatId: {
          [Op.ne]: excludeChatId
        }
      }
    });
    return chatRecord;
  };

  return Chat;
};