document.addEventListener("DOMContentLoaded", () => {

const API_BASE = "https://shahanfx-backend-9576.vercel.app";

const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const imageInput = document.getElementById("chartImage");

const analyzeBtn = document.getElementById("analyzeBtn");
const symbolSelect = document.getElementById("symbol");
const timeframeSelect = document.getElementById("timeframe");

const livePrice = document.getElementById("livePrice");
const liveBias = document.getElementById("liveBias");
const newsCount = document.getElementById("newsCount");
const lastUpdated = document.getElementById("lastUpdated");

const imagePreview = document.getElementById("imagePreview");
const previewImage = document.getElementById("previewImage");
const removeImage = document.getElementById("removeImage");

let selectedImage = null;
let isSending = false;
let controller = null;

// =========================
// ADD MESSAGE
// =========================

function addMessage(text, type = "bot") {

if (!chatBox) return;

const div = document.createElement("div");

div.className =
  type === "user"
    ? "message user-message"
    : "message ai-message";

const content = document.createElement("div");

content.className = "message-content";

content.textContent = String(text);

div.appendChild(content);

chatBox.appendChild(div);

chatBox.scrollTop = chatBox.scrollHeight;

}

// =========================
// LOADING
// =========================

function setLoading(loading) {

isSending = loading;

if (!sendBtn) return;

if (loading) {

  sendBtn.disabled = false;
  sendBtn.textContent = "⏹ وەستاندن";

} else {

  sendBtn.disabled = false;
  sendBtn.textContent = "➤ ناردن";

}

}

// =========================
// IMAGE → BASE64
// =========================

function fileToDataURL(file) {

return new Promise((resolve, reject) => {

  const reader = new FileReader();

  reader.onload = () => resolve(reader.result);

  reader.onerror = () =>
    reject(new Error("نەتوانرا وێنەکە بخوێندرێتەوە."));

  reader.readAsDataURL(file);

});

}

// =========================
// CLEAR IMAGE
// =========================

function clearImage() {

selectedImage = null;

if (imageInput) {
  imageInput.value = "";
}

if (previewImage) {
  previewImage.src = "";
}

if (imagePreview) {
  imagePreview.classList.add("hidden");
}

}

// =========================
// SEND MESSAGE
// =========================

async function sendMessage() {

// ئەگەر ناردن دەچێت، کلیکی دووەم = STOP
if (isSending) {

  if (controller) {
    controller.abort();
  }

  return;
}


const message =
  messageInput?.value.trim() || "";


if (!message && !selectedImage) {

  if (messageInput) {
    messageInput.focus();
  }

  return;
}


// پەیامی بەکارهێنەر لە چاتەکە دەمێنێتەوە
addMessage(
  message || "📷 شیکردنەوەی وێنەی Chart",
  "user"
);


if (messageInput) {
  messageInput.value = "";
}


setLoading(true);


controller = new AbortController();


try {

  let image = null;


  // =========================
  // IMAGE
  // =========================

  if (selectedImage) {

    image =
      await fileToDataURL(selectedImage);

  }


  // =========================
  // PAYLOAD
  // =========================

  const payload = {

    message: message,

    image: image,

    symbol:
      symbolSelect?.value ||
      "XAU/USD",

    interval:
      timeframeSelect?.value ||
      "5min"

  };


  console.log(
    "📤 Sending to ShahanFX Backend:",
    payload
  );


  // =========================
  // API REQUEST
  // =========================

  const response =
    await fetch(
      `${API_BASE}/api/chat`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Accept":
            "application/json"
        },

        body:
          JSON.stringify(payload),

        signal:
          controller.signal
      }
    );


  // =========================
  // RESPONSE
  // =========================

  const raw =
    await response.text();


  console.log(
    "📥 Backend response:",
    raw
  );


  let data;


  try {

    data =
      JSON.parse(raw);

  } catch {

    throw new Error(
      "Backend ـەکە وەڵامی JSON ـی دروست نەدا."
    );

  }


  // =========================
  // HTTP ERROR
  // =========================

  if (!response.ok) {

    throw new Error(
      data?.error ||
      data?.message ||
      `HTTP ${response.status}`
    );

  }


  // =========================
  // BACKEND ERROR
  // =========================

  if (data?.ok === false) {

    throw new Error(
      data.error ||
      data.message ||
      "Backend هەڵەیەکی گەڕاندەوە."
    );

  }


  // =========================
  // GET AI ANSWER
  // =========================

  const answer =
    data?.answer ||
    data?.message ||
    data?.response ||
    data?.text ||
    data?.result;


  if (!answer) {

    throw new Error(
      "AI هیچ وەڵامێکی نەگەڕاندەوە."
    );

  }


  // =========================
  // SHOW ANSWER
  // =========================

  addMessage(
    answer,
    "bot"
  );


  // وێنەکە تەنها دوای سەرکەوتنی ناردن پاک دەکرێتەوە
  clearImage();


} catch (error) {


  // =========================
  // STOPPED
  // =========================

  if (error?.name === "AbortError") {

    addMessage(
      "⏹ ناردنی پەیام وەستاندرا.",
      "bot"
    );

    return;
  }


  // =========================
  // ERROR
  // =========================

  console.error(
    "❌ ShahanFX AI Error:",
    error
  );


  addMessage(
    "❌ کێشەیەک لە ناردنی پەیام ڕوویدا:\n\n" +
    (error?.message ||
      "Unknown error"),
    "bot"
  );


} finally {

  controller = null;

  setLoading(false);

  if (messageInput) {
    messageInput.focus();
  }

}

}

// =========================
// SEND BUTTON
// =========================

if (sendBtn) {

sendBtn.addEventListener(
  "click",
  (event) => {

    event.preventDefault();

    sendMessage();

  }
);

}

// =========================
// ENTER
// =========================

if (messageInput) {

messageInput.addEventListener(
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

}

// =========================
// IMAGE SELECT
// =========================

if (imageInput) {

imageInput.addEventListener(
  "change",
  (event) => {

    const file =
      event.target.files?.[0];


    if (!file) {

      clearImage();

      return;
    }


    if (
      !file.type.startsWith("image/")
    ) {

      addMessage(
        "❌ تکایە تەنها وێنەی Chart هەڵبژێرە.",
        "bot"
      );

      clearImage();

      return;
    }


    selectedImage = file;


    if (previewImage) {

      previewImage.src =
        URL.createObjectURL(file);

    }


    if (imagePreview) {

      imagePreview.classList.remove(
        "hidden"
      );

    }

  }
);

}

// =========================
// REMOVE IMAGE
// =========================

if (removeImage) {

removeImage.addEventListener(
  "click",
  clearImage
);

}

// =========================
// QUICK BUTTONS
// =========================

document
.querySelectorAll(".quick-btn")
.forEach((button) => {

  button.addEventListener(
    "click",
    () => {

      const question =
        button.dataset.question ||
        button.dataset.message ||
        button.textContent.trim();


      if (!question) return;


      if (messageInput) {

        messageInput.value =
          question;

        messageInput.focus();

      }

    }
  );

});

// =========================
// MARKET
// =========================

async function loadMarket() {

if (
  !symbolSelect ||
  !timeframeSelect
) {
  return;
}


const symbol =
  symbolSelect.value;


const interval =
  timeframeSelect.value;


try {

  const response =
    await fetch(
      `${API_BASE}/api/market?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`
    );


  const data =
    await response.json();


  if (
    !response.ok ||
    data.ok === false
  ) {

    throw new Error(
      data.error ||
      "Market API error"
    );

  }


  if (
    Array.isArray(data.values) &&
    data.values.length
  ) {

    const current =
      data.values[0];

    const previous =
      data.values[1];


    const price =
      Number(current?.close);


    if (
      Number.isFinite(price)
    ) {

      livePrice.textContent =
        price > 100
          ? price.toFixed(2)
          : price.toFixed(5);

    }


    const currentClose =
      Number(current?.close);

    const previousClose =
      Number(previous?.close);


    if (
      Number.isFinite(currentClose) &&
      Number.isFinite(previousClose)
    ) {

      if (
        currentClose >
        previousClose
      ) {

        liveBias.textContent =
          "BULLISH";

      } else if (
        currentClose <
        previousClose
      ) {

        liveBias.textContent =
          "BEARISH";

      } else {

        liveBias.textContent =
          "WAIT";

      }

    }

    lastUpdated.textContent =
      new Date().toLocaleTimeString(
        "ku-IQ",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

  }

} catch (error) {

  console.error(
    "Market Error:",
    error
  );

  if (livePrice) {
    livePrice.textContent = "—";
  }

  if (liveBias) {
    liveBias.textContent = "WAIT";
  }

}

}

// =========================
// NEWS
// =========================

async function loadNews() {

try {

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);


  const response =
    await fetch(
      `${API_BASE}/api/news?from=${today}&to=${today}`
    );


  const data =
    await response.json();


  if (
    data.ok &&
    Array.isArray(data.events)
  ) {

    newsCount.textContent =
      data.events.length;

  } else {

    newsCount.textContent =
      "—";

  }

} catch (error) {

  console.error(
    "News Error:",
    error
  );

  if (newsCount) {
    newsCount.textContent =
      "—";
  }

}

}

// =========================
// LIVE ANALYSIS
// =========================

if (analyzeBtn) {

analyzeBtn.addEventListener(
  "click",
  () => {

    if (isSending) return;


    const symbol =
      symbolSelect?.value ||
      "XAU/USD";


    if (messageInput) {

      messageInput.value =
        `${symbol} بە داتای Live شیکاری بکە. Market Structure، Liquidity، FVG، Order Block، News و Bias بپشکنە.`;

    }


    sendMessage();

  }
);

}

// =========================
// SELECT CHANGES
// =========================

if (symbolSelect) {

symbolSelect.addEventListener(
  "change",
  loadMarket
);

}

if (timeframeSelect) {

timeframeSelect.addEventListener(
  "change",
  loadMarket
);

}

// =========================
// START
// =========================

loadMarket();

loadNews();

setInterval(
loadMarket,
60000
);

setInterval(
loadNews,
300000
);

console.log(
"✅ ShahanFX AI READY"
);

});
