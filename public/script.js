document.addEventListener("DOMContentLoaded", () => {
  const chatBox = document.getElementById("chatBox");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const imageInput = document.getElementById("imageInput");

  if (!chatBox || !messageInput || !sendBtn) {
    console.error("ShahanFX AI: Chat elements not found.");
    return;
  }

  let selectedImage = null;

  function addMessage(text, type = "bot") {
    const div = document.createElement("div");
    div.className = `message ${type}`;

    const content = document.createElement("div");
    content.className = "message-content";

    content.textContent = text;

    div.appendChild(content);
    chatBox.appendChild(div);

    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function setLoading(loading) {
    sendBtn.disabled = loading;

    if (loading) {
      sendBtn.dataset.oldText = sendBtn.textContent;
      sendBtn.textContent = "⏳";
    } else {
      sendBtn.textContent = sendBtn.dataset.oldText || "➤ ناردن";
    }
  }

  async function sendMessage() {
    const message = messageInput.value.trim();

    if (!message && !selectedImage) {
      return;
    }

    addMessage(message || "📷 شیکردنەوەی وێنەی Chart", "user");

    messageInput.value = "";
    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("message", message);

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("وەڵامی API ـەکە JSON نییە.");
      }

      if (!response.ok || data.ok === false) {
        throw new Error(
          data.error || "هەڵەیەک لە API ڕوویدا."
        );
      }

      const answer =
        data.answer ||
        data.message ||
        data.response ||
        "هیچ وەڵامێک نەگەڕایەوە.";

      addMessage(answer, "bot");

      selectedImage = null;

      if (imageInput) {
        imageInput.value = "";
      }

    } catch (error) {
      console.error("ShahanFX AI Error:", error);

      addMessage(
        "❌ کێشەیەک ڕوویدا: " + error.message,
        "bot"
      );
    }

    setLoading(false);
    messageInput.focus();
  }

  sendBtn.addEventListener("click", (event) => {
    event.preventDefault();
    sendMessage();
  });

  messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  if (imageInput) {
    imageInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];

      if (!file) {
        selectedImage = null;
        return;
      }

      if (!file.type.startsWith("image/")) {
        addMessage("❌ تکایە تەنها وێنەی Chart هەڵبژێرە.", "bot");
        imageInput.value = "";
        selectedImage = null;
        return;
      }

      selectedImage = file;

      addMessage(
        "📷 وێنەکە هەڵبژێردرا. ئێستا «➤ ناردن» دابگرە.",
        "bot"
      );
    });
  }

  // Quick buttons
  document.querySelectorAll("[data-message]").forEach((button) => {
    button.addEventListener("click", () => {
      messageInput.value = button.dataset.message || "";
      messageInput.focus();
    });
  });

  // Support common quick-button IDs
  document.querySelectorAll(".quick-btn, .quick-button").forEach((button) => {
    button.addEventListener("click", () => {
      const text =
        button.dataset.message ||
        button.textContent.trim();

      if (text) {
        messageInput.value = text;
        messageInput.focus();
      }
    });
  });

  console.log("ShahanFX AI Chat: READY");
});
