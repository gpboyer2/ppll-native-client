const db = require("../models");
const Chat = db.chats;
const ApiError = require("../utils/api-error");

const createChat = async (params) => {
  const { chatname, apiKey, message } = params;

  const chat = {
    chatname,
    apiKey,
    message,
    active: 0,
    status: 0,
    deleted: 0,
  };

  const result = await Chat.create(chat);

  return result;
};

async function latestMessage(params) {
  const { apiKey, apiSecret } = params;

  const result = await Chat.findOne({
    where: { apiKey, apiSecret },
    order: [["id", "DESC"]], // Assuming there's a created_at field to determine the order
    limit: 1,
  });

  return result;
}

const getAllChats = async (filter, options) => {
  const chats = await Chat.findAll();
  return chats;
};

const getChatById = async (id) => {
  return Chat.findOne({ where: { id } });
};

const getChatByApiKey = async (apiKey, apiSecret) => {
  return Chat.findOne({ where: { apiKey, apiSecret } });
};

const updateChatById = async (chatId, updateBody) => {
  const { chatname, apiKey, active, status } = updateBody;
  const chat = {
    chatname,
    apiKey,
    active,
    status,
  };

  const row = await Chat.update(chat, {
    where: { id: chatId },
  });

  return row;
};

const deleteChatById = async (chatId) => {
  const chat = await getChatById(chatId);
  if (!chat) return null;
  await chat.destroy();
  return chat;
};

module.exports = {
  createChat,
  latestMessage,
  getAllChats,
  getChatById,
  getChatByApiKey,
  updateChatById,
  deleteChatById,
};
