/**
 * 聊天控制器
 * 单用户系统：处理聊天相关的业务逻辑，提供消息发送、获取和管理功能
 */
const db = require("../models");
const Chat = db.chats;
const chatService = require("../service/chat.service");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catch-async");
const { sendSuccess, sendError } = require("../utils/api-response");

const chat = catchAsync((req, res) => {
  return sendSuccess(res, { message: "You are here now..." }, '聊天服务正常');
});

const signUp = catchAsync(async (req, res) => {
  const chat = await chatService.createChat(req.body);
  if (chat) {
    return sendSuccess(res, { chat }, '注册聊天成功');
  }
  return sendError(res, '聊天已存在', 409);
});

const sendMessage = catchAsync(async (req, res) => {
  const { apiKey, apiSecret } = req.body;
  let errorMsg = null;

  if (!apiKey) {
    return sendError(res, 'apiKey 未定义', 400);
  }

  const result = await chatService.createChat(req.body).catch((err) => {
    if (typeof err === "string") {
      errorMsg = JSON.parse(err);
    }
    if (typeof err === "object") {
      errorMsg = err;
    }
  });

  if (errorMsg) {
    return sendError(res, errorMsg.msg, 400);
  }

  if (result?.dataValues) {
    return sendSuccess(res, result?.dataValues, '发送消息成功');
  }

  return sendError(res, '发送消息失败', 500);
});

const message = catchAsync(async (req, res) => {
  const { apiKey, apiSecret } = req.query;
  let errorMsg = null;

  if (!apiKey) {
    return sendError(res, 'apiKey 未定义', 400);
  }

  const result = await chatService.latestMessage(req.query).catch((err) => {
    if (typeof err === "string") {
      errorMsg = JSON.parse(err);
    }
    if (typeof err === "object") {
      errorMsg = err;
    }
  });

  if (errorMsg) {
    return sendError(res, errorMsg.msg, 400);
  }

  if (result?.dataValues) {
    return sendSuccess(res, result?.dataValues, '获取消息成功');
  }

  return sendSuccess(res, result, '获取消息成功');
});

const getChatById = catchAsync(async (req, res) => {
  const chat = await chatService.getChatById(req.body.id);
  if (!chat) {
    return sendError(res, '聊天不存在', 404);
  }
  return sendSuccess(res, { chat }, '获取聊天成功');
});

const updateChat = catchAsync(async (req, res) => {
  const row = await chatService.updateChatById(req.body.id, req.body);
  if (!row) {
    return sendError(res, '聊天不存在', 404);
  }

  const updatedChat = await chatService.getChatById(req.body.id);
  return sendSuccess(res, updatedChat, '更新聊天成功');
});

const deleteChat = catchAsync(async (req, res) => {
  const deleted = await chatService.deleteChatById(req.body.id);
  if (!deleted) {
    return sendError(res, '聊天不存在', 404);
  }
  return sendSuccess(res, null, '删除聊天成功');
});

const getAllChats = catchAsync(async (req, res) => {
  const chats = await Chat.findAll();
  return sendSuccess(res, { chats }, '获取所有聊天成功');
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
