/**
 * 聊天控制器
 * 单用户系统：处理聊天相关的业务逻辑，提供消息发送、获取和管理功能
 */
const db = require("../models");
const Chat = db.chats;
const chatService = require("../service/chat.service");
const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");

const chat = (req, res) => {
  res.send({
    status: "success",
    code: 200,
    data: {
      message: "You are here now...",
    },
  });
};

const signUp = catchAsync(async (req, res) => {
  const chat = await chatService.createChat(req.body);
  if (chat) {
    res.send({ chat });
    return;
  }
  res.status(httpStatus.CONFLICT).send({
    message: "Chat already exists",
  });
});

const sendMessage = catchAsync(async (req, res) => {
  const { apiKey, apiSecret } = req.body;
  let errorMsg = null;

  if (!apiKey) {
    res.send({
      status: "error",
      code: 400,
      message: "apiKey is not defined",
    });
    return;
  }

  const result = await chatService.createChat(req.body).catch((error) => {
    if (typeof error === "string") {
      errorMsg = JSON.parse(error);
    }
    if (typeof error === "object") {
      errorMsg = error;
    }
  });

  if (errorMsg) {
    res.send({
      status: "error",
      code: 400,
      message: errorMsg.msg || errorMsg.message,
    });
    return;
  }

  if (result?.dataValues) {
    res.send({
      status: "success",
      code: 200,
      data: result?.dataValues,
    });
    return;
  }

  res.status(httpStatus.INTERNAL_SERVER_ERROR).send();
});

const message = catchAsync(async (req, res) => {
  const { apiKey, apiSecret } = req.query;
  let errorMsg = null;

  if (!apiKey) {
    res.send({
      status: "error",
      code: 400,
      message: "apiKey is not defined",
    });
    return;
  }

  const result = await chatService.latestMessage(req.query).catch((error) => {
    if (typeof error === "string") {
      errorMsg = JSON.parse(error);
    }
    if (typeof error === "object") {
      errorMsg = error;
    }
  });

  if (errorMsg) {
    res.send({
      status: "error",
      code: 400,
      message: errorMsg.msg || errorMsg.message,
    });
    return;
  }

  if (result?.dataValues) {
    res.send({
      status: "success",
      code: 200,
      data: result?.dataValues,
    });
    return;
  }

  res.send({
    status: "success",
    code: 200,
    data: result,
  });
});

const getChatById = catchAsync(async (req, res) => {
  const chat = await chatService.getChatById(req.body.id);
  if (!chat) {
    res.send({
      message: "Chat not found",
    });
    return;
  }
  res.send({ chat });
});

const updateChat = catchAsync(async (req, res) => {
  const row = await chatService.updateChatById(req.body.id, req.body);
  if (!row) {
    res.send({
      message: "Chat not found",
    });
    return;
  }

  res.send(await chatService.getChatById(req.body.id));
});

const deleteChat = catchAsync(async (req, res) => {
  const deleted = await chatService.deleteChatById(req.body.id);
  if (!deleted) {
    res.send({
      message: "Chat not found",
    });
  }
  res.status(httpStatus.NO_CONTENT).send();
});

const getAllChats = catchAsync(async (req, res) => {
  const chats = await Chat.findAll();
  res.send({ chats });
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
