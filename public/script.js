const messages = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");

let selectedImage = null;

function addMessage(text, type = "ai") {

  const row = document.createElement("div");

  row.className = `message ${type}`;

  row.innerHTML = `
    <div class="avatar">
      ${type === "ai" ? "🤖" : "👤"}
    </div>

    <div class="bubble"></div>
  `;

  row.querySelector(".bubble").textContent = text;

  messages.appendChild(row);

  messages.scrollTop = messages.scrollHeight;

  return row;
}

function quickQuestion(text) {
  input.value = text;
  input.focus();
}

imageInput.addEventListener("change", async () => {

  const file = imageInput.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {

    selectedImage = {
      data: reader.result.split(",")[1],
      mimeType: file.type
    };

    imagePreview.innerHTML = `
      <img src="${reader.result}" alt="Chart">
    `;
  };

  reader.readAsDataURL(file);
});

async function sendMessage() {

  const message = input.value.trim();

  if (!message && !selectedImage) return;

  addMessage(
    message || "تکایە ئەم chart ـە شیکاربکە.",
    "user"
  );

  input.value = "";

  sendBtn.disabled = true;

  const loading = addMessage(
    "⏳ تکایە چاوەڕێ بکە..."
  );

  try {

    const response = await fetch("/api/chat", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        message,
        image: selectedImage
      })

    });

    const data = await response.json();

    loading.remove();

    if (!response.ok) {
      throw new Error(
        data.error || "هەڵەیەک ڕوویدا"
      );
    }

    addMessage(
      data.answer || "وەڵام بەتاڵە."
    );

  } catch (error) {

    loading.remove();

    addMessage(
      "❌ " + error.message
    );

  } finally {

    sendBtn.disabled = false;

    selectedImage = null;

    imageInput.value = "";

    imagePreview.innerHTML = "";

  }
}

sendBtn.addEventListener(
  "click",
  sendMessage
);

input.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  }
);
