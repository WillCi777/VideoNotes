/**
 * PANEL — CHAT
 *
 * Free-form conversation with the active AI provider. Conversations are
 * persisted to chrome.storage.local ("ytd_chats") so they survive browser
 * restarts; the user can create, switch between, and delete conversations.
 *
 * Data shaping lives in src/core/chat-data.js (pure helpers); this module
 * only binds them to the DOM and to chrome.storage.
 */

let chatList = [];
let currentChatId = null;
let chatSending = false;

// ============================================================
// STORAGE
// ============================================================

async function loadChatsFromStorage() {
  try {
    const result = await chrome.storage.local.get(CHATS_STORAGE_KEY);
    return Array.isArray(result[CHATS_STORAGE_KEY])
      ? result[CHATS_STORAGE_KEY]
      : [];
  } catch (error) {
    console.error("[VideoNotes] Load chats error:", error);
    return [];
  }
}

async function saveChatsToStorage() {
  try {
    await chrome.storage.local.set({
      [CHATS_STORAGE_KEY]: deepCopyChats(capChats(chatList)),
    });
  } catch (error) {
    console.error("[VideoNotes] Save chats error:", error);
  }
}

function getCurrentChat() {
  return chatList.find((chat) => chat.id === currentChatId) || null;
}

// ============================================================
// RENDERING
// ============================================================

function renderChatList() {
  const listEl = document.getElementById("chatList");
  if (!listEl) return;
  listEl.innerHTML = "";

  chatList.forEach((chat) => {
    const item = document.createElement("div");
    item.className = `chat-list-item ${chat.id === currentChatId ? "active" : ""}`;
    item.dataset.chatId = chat.id;

    const title = document.createElement("span");
    title.className = "chat-list-title";
    title.textContent = chat.title || "新对话";
    title.addEventListener("click", () => openChat(chat.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "chat-list-delete";
    deleteBtn.type = "button";
    deleteBtn.title = "删除对话";
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteChat(chat.id);
    });

    item.appendChild(title);
    item.appendChild(deleteBtn);
    listEl.appendChild(item);
  });
}

function renderChatMessages() {
  const messagesEl = document.getElementById("chatMessages");
  if (!messagesEl) return;
  messagesEl.innerHTML = "";

  const chat = getCurrentChat();
  if (!chat) {
    messagesEl.innerHTML =
      '<div class="chat-empty">Ask questions about this video or about the transcript.</div>';
    return;
  }

  (chat.messages || []).forEach((message) => {
    const row = document.createElement("div");
    row.className = `chat-message chat-message--${message.role}`;
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerHTML = escapeHtml(message.content).replace(/\n/g, "<br>");
    row.appendChild(bubble);
    messagesEl.appendChild(row);
  });

  if (!chat.messages.length) {
    messagesEl.innerHTML =
      '<div class="chat-empty">Ask questions about this video or about the transcript.</div>';
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function openChat(chatId) {
  currentChatId = chatId;
  renderChatList();
  renderChatMessages();
  document.getElementById("chatInput")?.focus();
}

// ============================================================
// ACTIONS
// ============================================================

async function initChat() {
  chatList = await loadChatsFromStorage();
  if (chatList.length === 0) {
    const chat = createChat();
    chatList.push(chat);
    await saveChatsToStorage();
  }
  await openChat(chatList[chatList.length - 1].id);
}

async function newChat() {
  const chat = createChat();
  chatList.push(chat);
  await saveChatsToStorage();
  await openChat(chat.id);
}

async function deleteChat(chatId) {
  chatList = deleteChatById(chatList, chatId);
  await saveChatsToStorage();
  if (currentChatId === chatId) {
    if (chatList.length === 0) {
      const chat = createChat();
      chatList.push(chat);
      await saveChatsToStorage();
    }
    await openChat(chatList[chatList.length - 1].id);
  } else {
    renderChatList();
  }
}

async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const text = input?.value?.trim();
  if (!text || chatSending) return;

  let chat = getCurrentChat();
  if (!chat) {
    chat = createChat();
    chatList.push(chat);
    currentChatId = chat.id;
    renderChatList();
  }

  chatSending = true;
  setChatSendingState(true);
  input.value = "";

  appendChatMessage(chat, "user", text);
  await saveChatsToStorage();
  renderChatMessages();
  renderChatList();

  // Ask the background to answer with the active provider, sending the recent
  // conversation plus the current video as context.
  const messages = recentChatMessages(chat);
  const videoContext = {
    title: currentVideoTitle,
    channelName: currentChannelName,
    description: currentVideoDescription,
  };

  try {
    const result = await sendTranslationMessage({
      action: "chatMessage",
      messages,
      videoContext,
    });
    if (result?.success) {
      appendChatMessage(chat, "assistant", result.reply);
    } else {
      appendChatMessage(
        chat,
        "assistant",
        `⚠️ ${result?.error || "Chat request failed"}`,
      );
    }
  } catch (error) {
    appendChatMessage(
      chat,
      "assistant",
      `⚠️ ${error.message || "Chat request failed"}`,
    );
  }

  await saveChatsToStorage();
  renderChatMessages();
  renderChatList();
  chatSending = false;
  setChatSendingState(false);
}

function setChatSendingState(sending) {
  const sendBtn = document.getElementById("chatSendBtn");
  const input = document.getElementById("chatInput");
  if (sendBtn) {
    sendBtn.disabled = sending;
    sendBtn.textContent = sending ? "..." : "发送";
  }
  if (input) input.disabled = sending;
}

function setupChatEventListeners() {
  document.getElementById("newChatBtn")?.addEventListener("click", () => {
    newChat();
  });
  document.getElementById("chatSendBtn")?.addEventListener("click", () => {
    sendChatMessage();
  });
  document.getElementById("chatInput")?.addEventListener("keydown", (event) => {
    // Enter sends; Shift+Enter inserts a newline.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendChatMessage();
    }
  });
}
