// public/script.js

const SHAHANFX_LOGO =
  "https://raw.githubusercontent.com/tradingshahan-sys/shahanfx-backend/main/IMG_20260901_021941.jpg";

const messages =
  document.getElementById("messages");

const messageInput =
  document.getElementById("messageInput");

const sendBtn =
  document.getElementById("sendBtn");

const imageInput =
  document.getElementById("imageInput");

const imagePreview =
  document.getElementById("imagePreview");

let selectedImage = null;


// =====================================================
// ADD MESSAGE
// =====================================================

function addMessage(text, type = "ai") {
  if (!messages) return;

  const row =
    document.createElement("div");

  row.className =
    `message-row ${type}`;

  const avatar =
    document.createElement("div");

  avatar.className = "avatar";

  if (type === "ai") {
    const img =
      document.createElement("img");

    img.src = SHAHANFX_LOGO;
    img.alt = "ShahanFX AI";

    img.onerror = () => {
      avatar.textContent = "S";
    };

    avatar.appendChild(img);
  } else {
    avatar.textContent = "👤";
  }

  const bubble =
    document.createElement("div");

  bubble.className = "bubble";

  // textContent بەکاردهێنین بۆ ئەوەی
  // HTML ـی بەکارهێنەر اجرا نەبێت.
  bubble.textContent = text;

  row.appendChild(avatar);
  row.appendChild(bubble);

  messages.appendChild(row);

  messages.scrollTop =
    messages.scrollHeight;
}


// =====================================================
// QUICK QUESTION
// =====================================================

window.quickQuestion =
  function (question) {
    if (!messageInput) return;

    messageInput.value =
      question;

    sendMessage();
  };


// =====================================================
// IMAGE SELECT
// =====================================================

if (imageInput) {
  imageInput.addEventListener(
    "change",
    event => {
      const file =
        event.target.files?.[0];

      if (!file) {
        selectedImage = null;

        if (imagePreview) {
          imagePreview.innerHTML = "";
        }

        return;
      }

      if (!file.type.startsWith("image/")) {
        addMessage(
          "⚠️ تکایە تەنها وێنە هەڵبژێرە.",
          "ai"
        );

        imageInput.value = "";
        selectedImage = null;

        return;
      }

      const reader =
        new FileReader();

      reader.onload = () => {
        selectedImage =
          reader.result;

        if (imagePreview) {
          imagePreview.innerHTML =
            `<img
              src="${selectedImage}"
              alt="Chart Preview"
              style="
                max-width:140px;
                max-height:100px;
                border-radius:12px;
                object-fit:cover;
              "
            >`;
        }
      };

      reader.readAsDataURL(file);
    }
  );
}


// =====================================================
// SEND MESSAGE
// =====================================================

async function sendMessage() {
  if (!messageInput || !sendBtn) {
    return;
  }

  const message =
    messageInput.value.trim();

  if (!message && !selectedImage) {
    return;
  }

  addMessage(
    message ||
      "📷 شیکردنەوەی Chart ـەکە.",
    "user"
  );

  messageInput.value = "";

  sendBtn.disabled = true;

  const oldText =
    sendBtn.textContent;

  sendBtn.textContent =
    "⏳ ...";

  try {
    const response =
      await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          message,
          image:
            selectedImage,
          symbol:
            "XAU/USD",
          interval:
            "5min",
          action:
            "market"
        })
      });

    let data;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        "وەڵامی Backend دروست نییە."
      );
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data?.error ||
        "ShahanFX AI بەردەست نییە."
      );
    }

    addMessage(
      data.answer ||
        "هیچ وەڵامێک نەدرا.",
      "ai"
    );

  } catch (error) {
    console.error(
      "ShahanFX AI Error:",
      error
    );

    addMessage(
      `❌ ${error.message}`,
      "ai"
    );
  } finally {
    sendBtn.disabled =
      false;

    sendBtn.textContent =
      oldText || "Send";

    selectedImage =
      null;

    if (imageInput) {
      imageInput.value = "";
    }

    if (imagePreview) {
      imagePreview.innerHTML = "";
    }
  }
}


// =====================================================
// SEND BUTTON
// =====================================================

if (sendBtn) {
  sendBtn.addEventListener(
    "click",
    sendMessage
  );
}


// =====================================================
// ENTER KEY
// =====================================================

if (messageInput) {
  messageInput.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        sendMessage();
      }
    }
  );
}


// =====================================================
// GLOBAL
// =====================================================

window.sendMessage =
  sendMessage;
