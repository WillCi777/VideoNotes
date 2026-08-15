/**
 * CORE — CHAT DATA
 *
 * Pure conversation-data helpers: create chats, append messages, delete
 * chats, and keep the local archive bounded. No browser APIs are used, so
 * these are unit-testable and shared by the side panel.
 */

const CHATS_STORAGE_KEY = "ytd_chats";
const CHATS_MAX_SAVED = 50;
const CHAT_TITLE_MAX_CHARS = 24;
const CHAT_CONTEXT_MESSAGE_LIMIT = 20;

// Guarantees unique ids even when several chats are created in one millisecond.
let chatIdCounter = 0;

function createChat() {
  chatIdCounter += 1;
  const now = Date.now();
  return {
    id: `chat_${now}_${chatIdCounter}`,
    title: "",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Appends a message and stamps the conversation. The first user message
 * becomes the conversation title.
 */
function appendChatMessage(chat, role, content) {
  const text = String(content || "").trim();
  if (!text) return chat;
  const now = Date.now();
  chat.messages.push({ role, content: text, createdAt: now });
  chat.updatedAt = now;
  if (!chat.title && role === "user") {
    chat.title = text.slice(0, CHAT_TITLE_MAX_CHARS);
  }
  return chat;
}

function deleteChatById(chats, chatId) {
  return chats.filter((chat) => chat.id !== chatId);
}

/**
 * Keeps only the most recent `max` chats (newest last, matching insertion
 * order).
 */
function capChats(chats, max = CHATS_MAX_SAVED) {
  const list = Array.isArray(chats) ? chats : [];
  return list.slice(-max);
}

/**
 * Returns the last `limit` messages as plain { role, content } pairs for
 * sending to the AI provider.
 */
function recentChatMessages(chat, limit = CHAT_CONTEXT_MESSAGE_LIMIT) {
  if (!chat || !Array.isArray(chat.messages)) return [];
  return chat.messages.slice(-limit).map(({ role, content }) => ({
    role,
    content,
  }));
}

function deepCopyChats(chats) {
  return JSON.parse(JSON.stringify(chats || []));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CHATS_STORAGE_KEY,
    CHATS_MAX_SAVED,
    CHAT_TITLE_MAX_CHARS,
    CHAT_CONTEXT_MESSAGE_LIMIT,
    createChat,
    appendChatMessage,
    deleteChatById,
    capChats,
    recentChatMessages,
    deepCopyChats,
  };
}
