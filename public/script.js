const SHAHANFX_LOGO =
  "https://raw.githubusercontent.com/tradingshahan-sys/shahanfx-backend/main/IMG_20260901_021941.jpg";

let selectedImage = null;

function addMessage(type, text) {
  const chat =
    document.getElementById("chat") ||
    document.getElementById("chatMessages") ||
    document.querySelector(".chat-messages");

  if (!chat) return;

  const message = document.createElement("div");
  message.className =
    type === "user"
      ? "message user-message"
      : "message ai-message";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";

  if (type === "user") {
    avatar.textContent = "👤";
  } else {
    const img = document.createElement("img");
    img.src = SHAHANFX_LOGO;
    img.alt = "ShahanFX";
    img.onerror = function () {
      this.style.display = "none";
      avatar.textContent = "S";
    };
    avatar.appendChild(img);
  }

  const content = document.createElement("div");
  content.className = "message-content";

  content.textContent = text || "";

  message.appendChild(avatar);
  message.appendChild(content);

  chat.appendChild(message);

  chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
  const chat =
    document.getElementById("chat") ||
    document.getElementById("chatMessages") ||
    document.querySelector(".chat-messages");

  if (!chat) return;

  const old = document.getElementById("shahanfx-typing");

  if (old) old.remove();

  const message = document.createElement("div");

  message.id = "shahanfx-typing";
  message.className = "message ai-message";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";

  const img = document.createElement("img");
  img.src = SHAHANFX_LOGO;
  img.alt = "ShahanFX";

  avatar.appendChild(img);

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = "⏳ ShahanFX AI لە وەڵامدانەوەدایە...";

  message.appendChild(avatar);
  message.appendChild(content);

  chat.appendChild(message);

  chat.scrollTop = chat.scrollHeight;
}

function hideTyping() {
  const typing =
    document.getElementById("shahanfx-typing");

  if (typing) {
    typing.remove();
  }
}

async function askShahanFX(message = "") {
  const input =
    document.getElementById("messageInput") ||
    document.getElementById("chatInput") ||
    document.querySelector("textarea");

  if (!message && input) {
    message = input.value.trim();
  }

  if (!message && !selectedImage) {
    return;
  }

  addMessage(
    "user",
    message || "📷 شیکردنەوەی Chart"
  );

  if (input) {
    input.value = "";
  }

  showTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: message,
        image: selectedImage,
        symbol: "XAU/USD",
        interval: "5min",
        action: "market"
      })
    });

    let data = null;

    try {
      data = await response.json();
    } catch (error) {
      hideTyping();

      addMessage(
        "ai",
        "❌ Backend وەڵامێکی دروستی JSON ـی نەگەڕاندەوە."
      );

      return;
    }

    hideTyping();

    const isSuccess =
      data &&
      (data.ok === true ||
        data.success === true);

    if (!response.ok || !isSuccess) {
      addMessage(
        "ai",
        data?.error ||
          "❌ Backend وەڵامێکی دروستی نەدا."
      );

      return;
    }

    if (!data.answer) {
      addMessage(
        "ai",
        "❌ Backend وەڵامی AI ـی بەتاڵی نارد."
      );

      return;
    }

    addMessage(
      "ai",
      data.answer
    );

    selectedImage = null;

    const preview =
      document.getElementById("imagePreview");

    if (preview) {
      preview.innerHTML = "";
      preview.style.display = "none";
    }

    const imageInput =
      document.getElementById("imageInput") ||
      document.getElementById("fileInput");

    if (imageInput) {
      imageInput.value = "";
    }

  } catch (error) {
    console.error(
      "ShahanFX Frontend Error:",
      error
    );

    hideTyping();

    addMessage(
      "ai",
      "❌ نەتوانرا پەیوەندی بە ShahanFX AI Backend ـەوە بکرێت. تکایە Backend و Deployment بپشکنە."
    );
  }
}

function quickQuestion(question) {
  askShahanFX(question);
}

function handleImageUpload(event) {
  const file =
    event.target.files &&
    event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("تکایە تەنها وێنە هەڵبژێرە.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    selectedImage = e.target.result;

    const preview =
      document.getElementById("imagePreview");

    if (preview) {
      preview.innerHTML = "";

      const img =
        document.createElement("img");

      img.src = selectedImage;
      img.alt = "Chart Preview";

      preview.appendChild(img);

      preview.style.display = "block";
    }
  };

  reader.readAsDataURL(file);
}

document.addEventListener(
  "DOMContentLoaded",
  function () {
    const imageInput =
      document.getElementById("imageInput") ||
      document.getElementById("fileInput");

    if (imageInput) {
      imageInput.addEventListener(
        "change",
        handleImageUpload
      );
    }

    const input =
      document.getElementById("messageInput") ||
      document.getElementById("chatInput");

    if (input) {
      input.addEventListener(
        "keydown",
        function (event) {
          if (
            event.key === "Enter" &&
            !event.shiftKey
          ) {
            event.preventDefault();
            askShahanFX();
          }
        }
      );
    }
  }
);
