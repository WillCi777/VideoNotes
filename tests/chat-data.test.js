const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createChat,
  appendChatMessage,
  deleteChatById,
  capChats,
  recentChatMessages,
  deepCopyChats,
  CHATS_MAX_SAVED,
} = require("../src/core/chat-data.js");

test("createChat builds an empty conversation with stable fields", () => {
  const chat = createChat();
  assert.match(chat.id, /^chat_\d+_\d+$/);
  assert.equal(chat.title, "");
  assert.deepEqual(chat.messages, []);
  assert.ok(chat.createdAt > 0);
  assert.equal(chat.updatedAt, chat.createdAt);
});

test("appendChatMessage stamps messages and derives the title from the first user message", () => {
  const chat = createChat();
  appendChatMessage(chat, "assistant", "  ");
  assert.equal(chat.messages.length, 0); // blank content is ignored

  appendChatMessage(chat, "user", "What is the main idea of this video?");
  assert.equal(chat.messages.length, 1);
  assert.equal(chat.messages[0].role, "user");
  assert.equal(chat.messages[0].content, "What is the main idea of this video?");
  assert.equal(chat.title, "What is the main idea of");

  appendChatMessage(chat, "assistant", "The main idea is X.");
  assert.equal(chat.messages.length, 2);
  assert.equal(chat.messages[1].role, "assistant");
  assert.equal(chat.title, "What is the main idea of"); // title stays
});

test("deleteChatById removes only the matching conversation", () => {
  const a = createChat();
  const b = createChat();
  const c = createChat();
  const remaining = deleteChatById([a, b, c], b.id);
  assert.deepEqual(remaining.map((chat) => chat.id), [a.id, c.id]);
});

test("capChats keeps only the most recent conversations", () => {
  const chats = [createChat(), createChat(), createChat()];
  assert.equal(capChats(chats, 2).length, 2);
  assert.equal(capChats(chats, 10).length, 3);
  assert.equal(capChats(null).length, 0);
  assert.equal(capChats(chats, CHATS_MAX_SAVED).length, 3);
});

test("recentChatMessages returns the last N messages as plain pairs", () => {
  const chat = createChat();
  for (let i = 0; i < 5; i++) {
    appendChatMessage(chat, "user", `u${i}`);
    appendChatMessage(chat, "assistant", `a${i}`);
  }
  const recent = recentChatMessages(chat, 4);
  assert.equal(recent.length, 4);
  assert.equal(recent[0].content, "u3");
  assert.equal(recent[3].content, "a4");
  assert.ok(recent.every(({ role, content }) => role && content));
});

test("deepCopyChats clones without shared references", () => {
  const chat = createChat();
  appendChatMessage(chat, "user", "hello");
  const copy = deepCopyChats([chat]);
  assert.deepEqual(copy, [chat]);
  copy[0].messages.push({ role: "user", content: "mutated", createdAt: 0 });
  assert.equal(chat.messages.length, 1);
});
