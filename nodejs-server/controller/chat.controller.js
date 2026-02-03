/**
 * 聊天控制器
 * 单用户系统：处理聊天相关的业务逻辑，提供消息发送、获取和管理功能
 */
const db = require("../models");
const Chat = db.chats;
const chatService = require("../service/chat.service");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catch-async");

const chat = catchAsync((req, res) => {
  return res.apiSuccess({ message: "You are here now..." }, '聊天服务正常');
});

const signUp = catchAsync(async (req, res) => {
  const chat = await chatService.createChat(req.body);
  if (chat) {
    return res.apiSuccess({ chat }, '注册聊天成功');
  }
  return res.apiError(null, '聊天已存在');
});

const sendMessage = catchAsync(async (req, res) => {
  const { api_key, api_secret } = req.body;
  /** @type {{msg?: string} | null} */
  let error_msg = null;

  if (!api_key) {
    return res.apiError(null, 'api_key 未定义');
  }

  const result = await chatService.createChat(req.body).catch((err) => {
    if (typeof err === "string") {
      error_msg = JSON.parse(err);
    }
    if (typeof err === "object") {
      error_msg = err;
    }
  });

  if (error_msg) {
    return res.apiError(null, error_msg.msg);
  }

  if (result?.dataValues) {
    return res.apiSuccess(result?.dataValues, '发送消息成功');
  }

  return res.apiError(null, '发送消息失败');
});

const message = catchAsync(async (req, res) => {
  const { api_key, api_secret } = req.query;
  /** @type {{msg?: string} | null} */
  let error_msg = null;

  if (!api_key) {
    return res.apiError(null, 'api_key 未定义');
  }

  const result = await chatService.latestMessage(req.query).catch((err) => {
    if (typeof err === "string") {
      error_msg = JSON.parse(err);
    }
    if (typeof err === "object") {
      error_msg = err;
    }
  });

  if (error_msg) {
    return res.apiError(null, error_msg.msg);
  }

  if (result?.dataValues) {
    return res.apiSuccess(result?.dataValues, '获取消息成功');
  }

  return res.apiSuccess(result, '获取消息成功');
});

const getChatById = catchAsync(async (req, res) => {
  const chat = await chatService.getChatById(req.body.id);
  if (!chat) {
    return res.apiError(null, '聊天不存在');
  }
  return res.apiSuccess({ chat }, '获取聊天成功');
});

const updateChat = catchAsync(async (req, res) => {
  const row = await chatService.updateChatById(req.body.id, req.body);
  if (!row) {
    return res.apiError(null, '聊天不存在');
  }

  const updatedChat = await chatService.getChatById(req.body.id);
  return res.apiSuccess(updatedChat, '更新聊天成功');
});

const deleteChat = catchAsync(async (req, res) => {
  const deleted = await chatService.deleteChatById(req.body.id);
  if (!deleted) {
    return res.apiError(null, '聊天不存在');
  }
  return res.apiSuccess(null, '删除聊天成功');
});

const getAllChats = catchAsync(async (req, res) => {
  const chats = await Chat.findAll();
  return res.apiSuccess({ chats }, '获取所有聊天成功');
});

module.exports = {
  chat,
  signUp,
  getChatById,
  updateChat,
  deleteChat,
  getAllChats,
  sendMessage,
  message,
};
