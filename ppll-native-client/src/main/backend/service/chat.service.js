const db = require("../models");
const Chat = db.chats;
const ApiError = require("../utils/api-error");

const createChat = async (params) => {
    const { chatname, api_key, message } = params;

    const chat = {
        chatname,
        api_key,
        message,
        active: 0,
        status: 0,
        deleted: 0,
    };

    const result = await Chat.create(chat);

    return result;
};

async function latestMessage(params) {
    const { api_key } = params;

    const result = await Chat.findOne({
        where: { api_key },
        order: [["id", "DESC"]],
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

const getChatByApiKey = async (api_key) => {
    return Chat.findOne({ where: { api_key } });
};

const updateChatById = async (chatId, updateBody) => {
    const { chatname, api_key, active, status } = updateBody;
    const chat = {
        chatname,
        api_key,
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
