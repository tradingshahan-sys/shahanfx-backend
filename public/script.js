// =====================================================
// SHAHANFX AI — LIVE ANALYSIS PRO
// Frontend Controller
// =====================================================

const SHAHANFX_LOGO =
  "https://raw.githubusercontent.com/tradingshahan-sys/shahanfx-backend/main/IMG_20260901_021941.jpg";


// =====================================================
// ELEMENTS
// =====================================================

const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const analyzeBtn = document.getElementById("analyzeBtn");

const symbolSelect = document.getElementById("symbol");
const timeframeSelect = document.getElementById("timeframe");

const livePrice = document.getElementById("livePrice");
const liveBias = document.getElementById("liveBias");
const newsCount = document.getElementById("newsCount");
const lastUpdated = document.getElementById("lastUpdated");

const chartImage = document.getElementById("chartImage");
const imagePreview = document.getElementById("imagePreview");
const previewImage = document.getElementById("previewImage");
const removeImage = document.getElementById("removeImage");


// =====================================================
// STATE
// =====================================================

let selectedImage = null;
let marketTimer = null;
let isSending = false;


// =====================================================
// SAFE TEXT
// =====================================================

function cleanText(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}


// =====================================================
// MESSAGE
// =====================================================

function addMessage(type, text) {

  if (!chatBox) return;

  const message = document.createElement("div");

  message.className =
    `message ${type === "ai" ? "ai-message" : "user-message"}`;


  const avatar = document.createElement("div");

  avatar.className = "avatar";


  if (type === "ai") {

    const img = document.createElement("img");

    img.src = SHAHANFX_LOGO;

    img.alt = "ShahanFX AI";

    avatar.appendChild(img);

  } else {

    avatar.textContent = "👤";

  }


  const content = document.createElement("div");

  content.className = "message-content";


  const name = document.createElement("div");

  name.className = "message-name";

  name.textContent =
    type === "ai"
      ? "ShahanFX AI"
      : "تۆ";


  const text = document.createElement("div");

  text.className = "message-text";

  text.textContent = cleanText(text);


  // Fix because variable name above shadows function argument
  text.textContent = cleanText(arguments[1]);


  content.appendChild(name);

  content.appendChild(text);

  message.appendChild(avatar);

  message.appendChild(content);

  chatBox.appendChild(message);


  chatBox.scrollTop =
    chatBox.scrollHeight;

  return message;
}


// =====================================================
// TYPING
// =====================================================

function addTyping() {

  const message =
    document.createElement("div");

  message.className =
    "message ai-message";

  message.id =
    "typingMessage";


  const avatar =
    document.createElement("div");

  avatar.className =
    "avatar";


  const img =
    document.createElement("img");

  img.src =
    SHAHANFX_LOGO;

  img.alt =
    "ShahanFX AI";

  avatar.appendChild(img);


  const content =
    document.createElement("div");

  content.className =
    "message-content";


  const name =
    document.createElement("div");

  name.className =
    "message-name";

  name.textContent =
    "ShahanFX AI";


  const typing =
    document.createElement("div");

  typing.className =
    "message-text";


  typing.innerHTML =
    `
      <div class="typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;


  content.appendChild(name);

  content.appendChild(typing);

  message.appendChild(avatar);

  message.appendChild(content);

  chatBox.appendChild(message);


  chatBox.scrollTop =
    chatBox.scrollHeight;

}


// =====================================================
// REMOVE TYPING
// =====================================================

function removeTyping() {

  const typing =
    document.getElementById(
      "typingMessage"
    );

  if (typing) {
    typing.remove();
  }

}


// =====================================================
// IMAGE → BASE64
// =====================================================

function fileToBase64(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload = () =>
        resolve(reader.result);

      reader.onerror =
        reject;

      reader.readAsDataURL(file);

    }
  );

}


// =====================================================
// IMAGE SELECT
// =====================================================

if (chartImage) {

  chartImage.addEventListener(
    "change",
    async function () {

      const file =
        this.files?.[0];

      if (!file) {
        return;
      }


      if (
        !file.type.startsWith("image/")
      ) {

        addMessage(
          "ai",
          "❌ تکایە تەنها فایلێکی وێنە هەڵبژێرە."
        );

        return;
      }


      // Limit around 8MB
      if (file.size > 8 * 1024 * 1024) {

        addMessage(
          "ai",
          "❌ قەبارەی وێنەکە زۆرە. تکایە وێنەیەکی کەمتر لە 8MB هەڵبژێرە."
        );

        this.value = "";

        return;
      }


      try {

        selectedImage =
          await fileToBase64(file);


        if (previewImage) {
          previewImage.src =
            selectedImage;
        }


        if (imagePreview) {
          imagePreview.classList.remove(
            "hidden"
          );
        }

      } catch {

        addMessage(
          "ai",
          "❌ نەتوانرا وێنەکە بخوێندرێتەوە."
        );

      }

    }
  );

}


// =====================================================
// REMOVE IMAGE
// =====================================================

if (removeImage) {

  removeImage.addEventListener(
    "click",
    () => {

      selectedImage = null;

      if (chartImage) {
        chartImage.value = "";
      }

      if (previewImage) {
        previewImage.src = "";
      }

      if (imagePreview) {
        imagePreview.classList.add(
          "hidden"
        );
      }

    }
  );

}


// =====================================================
// LIVE MARKET
// =====================================================

async function loadMarket() {

  const symbol =
    symbolSelect?.value ||
    "XAU/USD";

  const interval =
    timeframeSelect?.value ||
    "5min";


  try {

    const url =
      `/api/market?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`;


    const response =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      data?.ok !== true
    ) {

      if (livePrice) {
        livePrice.textContent =
          "—";
      }

      return;

    }


    const values =
      Array.isArray(data.values)
        ? data.values
        : [];


    if (!values.length) {
      return;
    }


    const latest =
      values[0];


    const price =
      Number(
        latest.close
      );


    if (
      Number.isFinite(price)
    ) {

      if (livePrice) {

        livePrice.textContent =
          price.toLocaleString(
            "en-US",
            {
              minimumFractionDigits:
                price < 10 ? 5 : 2,
              maximumFractionDigits:
                price < 10 ? 5 : 2
            }
          );

      }

    }


    // =================================================
    // SIMPLE LIVE BIAS
    // =================================================

    let bias =
      "WAIT";


    if (values.length >= 5) {

      const current =
        Number(values[0].close);

      const previous =
        Number(values[4].close);


      if (
        Number.isFinite(current) &&
        Number.isFinite(previous)
      ) {

        if (current > previous) {
          bias = "BULLISH";
        }

        else if (
          current < previous
        ) {
          bias = "BEARISH";
        }

      }

    }


    if (liveBias) {

      liveBias.textContent =
        bias;

      liveBias.style.color =
        bias === "BULLISH"
          ? "#35d28a"
          : bias === "BEARISH"
            ? "#ef5d5d"
            : "";

    }


    if (lastUpdated) {

      const now =
        new Date();

      lastUpdated.textContent =
        now.toLocaleTimeString(
          "ku-IQ",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          }
        );

    }

  } catch (error) {

    console.error(
      "Live Market Error:",
      error
    );

  }

}


// =====================================================
// LIVE NEWS COUNT
// =====================================================

async function loadNews() {

  try {

    const response =
      await fetch(
        "/api/news",
        {
          method: "GET",
          cache: "no-store"
        }
      );


    const data =
      await response.json();


    if (
      data?.ok === true &&
      Array.isArray(data.events)
    ) {

      if (newsCount) {

        newsCount.textContent =
          data.events.length;

      }

    }

    else {

      if (newsCount) {
        newsCount.textContent =
          "—";
      }

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


// =====================================================
// LOAD ALL LIVE DATA
// =====================================================

async function loadLiveData() {

  await Promise.allSettled(
    [
      loadMarket(),
      loadNews()
    ]
  );

}


// =====================================================
// START AUTO REFRESH
// =====================================================

function startLiveEngine() {

  loadLiveData();


  if (marketTimer) {
    clearInterval(
      marketTimer
    );
  }


  // Refresh every 10 seconds
  marketTimer =
    setInterval(
      loadLiveData,
      10000
    );

}


// =====================================================
// SEND TO AI
// =====================================================

async function sendMessage(
  customMessage = null
) {

  if (isSending) {
    return;
  }


  const message =
    customMessage !== null
      ? customMessage.trim()
      : messageInput?.value.trim();


  if (
    !message &&
    !selectedImage
  ) {

    addMessage(
      "ai",
      "✍️ تکایە پرسیارێک بنووسە یان Chart ـێک بنێرە."
    );

    return;
  }


  isSending = true;


  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent =
      "⏳ چاوەڕوانبە...";
  }


  if (analyzeBtn) {
    analyzeBtn.disabled = true;
  }


  if (message) {
    addMessage(
      "user",
      message
    );
  }

  else if (selectedImage) {

    addMessage(
      "user",
      "📷 ئەم Chart ـە شیکاری بکە."
    );

  }


  if (
    customMessage === null &&
    messageInput
  ) {

    messageInput.value = "";

  }


  addTyping();


  try {

    const body = {
      message:
        message ||
        "ئەم Chart ـە بە شێوەی پیشەیی شیکاری بکە.",
      symbol:
        symbolSelect?.value ||
        "XAU/USD",
      timeframe:
        timeframeSelect?.value ||
        "5min"
    };


    if (selectedImage) {
      body.image =
        selectedImage;
    }


    const response =
      await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(body)
        }
      );


    let data = null;


    try {

      data =
        await response.json();

    } catch {

      data = null;

    }


    removeTyping();


    const isSuccess =
      data &&
      (
        data.ok === true ||
        data.success === true
      );


    if (
      !response.ok ||
      !isSuccess
    ) {

      addMessage(
        "ai",
        data?.error ||
        "❌ ShahanFX AI لە ئێستادا بەردەست نییە. تکایە دووبارە هەوڵ بدە."
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


    // Refresh live data after analysis
    loadLiveData();


  } catch (error) {

    console.error(
      "AI Error:",
      error
    );


    removeTyping();


    addMessage(
      "ai",
      "❌ پەیوەندی بە ShahanFX AI نەکرا. تکایە دووبارە هەوڵ بدە."
    );

  }


  finally {

    isSending = false;


    if (sendBtn) {

      sendBtn.disabled = false;

      sendBtn.textContent =
        "➤ ناردن";

    }


    if (analyzeBtn) {
      analyzeBtn.disabled = false;
    }

  }

}


// =====================================================
// SEND BUTTON
// =====================================================

if (sendBtn) {

  sendBtn.addEventListener(
    "click",
    () => sendMessage()
  );

}


// =====================================================
// LIVE ANALYSIS BUTTON
// =====================================================

if (analyzeBtn) {

  analyzeBtn.addEventListener(
    "click",
    () => {

      const symbol =
        symbolSelect?.value ||
        "XAU/USD";

      const timeframe =
        timeframeSelect?.value ||
        "5min";


      const question =
        `
${symbol} لە Timeframe ـی ${timeframe}
بە داتای Live شیکارییەکی تەواو بکە.

Price
Candle
Market Structure
Liquidity
BSL / SSL
Liquidity Sweep
BOS / CHOCH
FVG
Order Block
Premium / Discount
ALC™
ICT
SMC
News Impact

لە کۆتاییدا:
BUY / SELL / WAIT
Entry
Stop Loss
Take Profit
Risk/Reward
Confidence

ئەگەر Confirmation تەواو نییە، WAIT بنووسە.
        `.trim();


      sendMessage(question);

    }
  );

}


// =====================================================
// QUICK BUTTONS
// =====================================================

document
  .querySelectorAll(
    ".quick-btn"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const question =
            button.dataset.question;

          if (!question) {
            return;
          }


          if (messageInput) {
            messageInput.value =
              question;

            messageInput.focus();
          }

        }
      );

    }
  );


// =====================================================
// ENTER TO SEND
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
// SYMBOL / TIMEFRAME CHANGE
// =====================================================

if (symbolSelect) {

  symbolSelect.addEventListener(
    "change",
    () => {

      loadMarket();

    }
  );

}


if (timeframeSelect) {

  timeframeSelect.addEventListener(
    "change",
    () => {

      loadMarket();

    }
  );

}


// =====================================================
// INITIAL START
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    startLiveEngine();

  }
);
