// =====================================================
// SHAHANFX AI — LIVE ANALYSIS PRO
// Frontend Controller — FIXED
// =====================================================

const SHAHANFX_LOGO =
  "https://raw.githubusercontent.com/tradingshahan-sys/shahanfx-backend/main/IMG_20260901_021941.jpg";


// =====================================================
// STATE
// =====================================================

let selectedImage = null;
let marketTimer = null;
let isSending = false;


// =====================================================
// ELEMENTS
// =====================================================

let chatBox;
let messageInput;
let sendBtn;
let analyzeBtn;

let symbolSelect;
let timeframeSelect;

let livePrice;
let liveBias;
let newsCount;
let lastUpdated;

let chartImage;
let imagePreview;
let previewImage;
let removeImage;


// =====================================================
// SAFE TEXT
// =====================================================

function cleanText(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}


// =====================================================
// GET ELEMENTS
// =====================================================

function initElements() {

  chatBox =
    document.getElementById("chatBox");

  messageInput =
    document.getElementById("messageInput");

  sendBtn =
    document.getElementById("sendBtn");

  analyzeBtn =
    document.getElementById("analyzeBtn");

  symbolSelect =
    document.getElementById("symbol");

  timeframeSelect =
    document.getElementById("timeframe");

  livePrice =
    document.getElementById("livePrice");

  liveBias =
    document.getElementById("liveBias");

  newsCount =
    document.getElementById("newsCount");

  lastUpdated =
    document.getElementById("lastUpdated");

  chartImage =
    document.getElementById("chartImage");

  imagePreview =
    document.getElementById("imagePreview");

  previewImage =
    document.getElementById("previewImage");

  removeImage =
    document.getElementById("removeImage");

}


// =====================================================
// MESSAGE
// =====================================================

function addMessage(type, text) {

  if (!chatBox) {
    console.error(
      "ShahanFX: chatBox نەدۆزرایەوە."
    );

    return null;
  }


  const message =
    document.createElement("div");

  message.className =
    type === "ai"
      ? "message ai-message"
      : "message user-message";


  // ---------------------------------------------------
  // AVATAR
  // ---------------------------------------------------

  const avatar =
    document.createElement("div");

  avatar.className =
    "avatar";


  if (type === "ai") {

    const img =
      document.createElement("img");

    img.src =
      SHAHANFX_LOGO;

    img.alt =
      "ShahanFX AI";

    avatar.appendChild(img);

  } else {

    avatar.textContent =
      "👤";

  }


  // ---------------------------------------------------
  // CONTENT
  // ---------------------------------------------------

  const content =
    document.createElement("div");

  content.className =
    "message-content";


  const name =
    document.createElement("div");

  name.className =
    "message-name";

  name.textContent =
    type === "ai"
      ? "ShahanFX AI"
      : "تۆ";


  const textElement =
    document.createElement("div");

  textElement.className =
    "message-text";

  textElement.textContent =
    cleanText(text);


  content.appendChild(name);

  content.appendChild(textElement);

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

  if (!chatBox) {
    return;
  }


  removeTyping();


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

  typing.innerHTML = `
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
// FILE → BASE64
// =====================================================

function fileToBase64(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();


      reader.onload = () => {
        resolve(reader.result);
      };


      reader.onerror = () => {
        reject(
          new Error(
            "نەتوانرا فایل بخوێندرێتەوە."
          )
        );
      };


      reader.readAsDataURL(file);
    }
  );
}


// =====================================================
// IMAGE SELECT
// =====================================================

function initImageUpload() {

  if (!chartImage) {
    return;
  }


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

        this.value = "";

        return;
      }


      // 8MB
      if (
        file.size >
        8 * 1024 * 1024
      ) {

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

      } catch (error) {

        console.error(
          "Image Error:",
          error
        );

        selectedImage =
          null;

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

function initRemoveImage() {

  if (!removeImage) {
    return;
  }


  removeImage.addEventListener(
    "click",
    () => {

      selectedImage =
        null;


      if (chartImage) {
        chartImage.value =
          "";
      }


      if (previewImage) {
        previewImage.src =
          "";
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
      `/api/market?symbol=${encodeURIComponent(
        symbol
      )}&interval=${encodeURIComponent(
        interval
      )}`;


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

      if (liveBias) {
        liveBias.textContent =
          "WAIT";
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


    // -------------------------------------------------
    // PRICE
    // -------------------------------------------------

    if (
      Number.isFinite(price) &&
      livePrice
    ) {

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


    // -------------------------------------------------
    // SIMPLE BIAS
    // -------------------------------------------------

    let bias =
      "WAIT";


    if (values.length >= 5) {

      const current =
        Number(
          values[0].close
        );

      const previous =
        Number(
          values[4].close
        );


      if (
        Number.isFinite(current) &&
        Number.isFinite(previous)
      ) {

        if (
          current > previous
        ) {

          bias =
            "BULLISH";

        } else if (
          current < previous
        ) {

          bias =
            "BEARISH";
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


    // -------------------------------------------------
    // UPDATED
    // -------------------------------------------------

    if (lastUpdated) {

      lastUpdated.textContent =
        new Date().toLocaleTimeString(
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
// LIVE NEWS
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

    } else {

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
// LIVE DATA
// =====================================================

async function loadLiveData() {

  await Promise.allSettled([
    loadMarket(),
    loadNews()
  ]);
}


// =====================================================
// START LIVE ENGINE
// =====================================================

function startLiveEngine() {

  loadLiveData();


  if (marketTimer) {

    clearInterval(
      marketTimer
    );
  }


  marketTimer =
    setInterval(
      loadLiveData,
      10000
    );
}


// =====================================================
// SEND MESSAGE
// =====================================================

async function sendMessage(
  customMessage = null
) {

  if (isSending) {
    return;
  }


  const message =
    customMessage !== null
      ? cleanText(customMessage).trim()
      : messageInput
        ? messageInput.value.trim()
        : "";


  // ---------------------------------------------------
  // EMPTY
  // ---------------------------------------------------

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


  isSending =
    true;


  // ---------------------------------------------------
  // DISABLE BUTTONS
  // ---------------------------------------------------

  if (sendBtn) {

    sendBtn.disabled =
      true;

    sendBtn.textContent =
      "⏳ چاوەڕوانبە...";
  }


  if (analyzeBtn) {

    analyzeBtn.disabled =
      true;
  }


  // ---------------------------------------------------
  // USER MESSAGE
  // ---------------------------------------------------

  if (message) {

    addMessage(
      "user",
      message
    );

  } else if (
    selectedImage
  ) {

    addMessage(
      "user",
      "📷 ئەم Chart ـە شیکاری بکە."
    );
  }


  // ---------------------------------------------------
  // CLEAR INPUT
  // ---------------------------------------------------

  if (
    customMessage === null &&
    messageInput
  ) {

    messageInput.value =
      "";
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


    // -------------------------------------------------
    // IMAGE
    // -------------------------------------------------

    if (selectedImage) {

      body.image =
        selectedImage;
    }


    // -------------------------------------------------
    // API REQUEST
    // -------------------------------------------------

    console.log(
      "ShahanFX AI → Sending request..."
    );


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


    let data =
      null;


    try {

      data =
        await response.json();

    } catch (jsonError) {

      console.error(
        "JSON Error:",
        jsonError
      );
    }


    removeTyping();


    // -------------------------------------------------
    // API ERROR
    // -------------------------------------------------

    if (
      !response.ok
    ) {

      console.error(
        "ShahanFX API Error:",
        response.status,
        data
      );


      addMessage(
        "ai",
        data?.error ||
        `❌ هەڵەی Backend (${response.status}).`
      );

      return;
    }


    const isSuccess =
      data &&
      (
        data.ok === true ||
        data.success === true
      );


    if (!isSuccess) {

      addMessage(
        "ai",
        data?.error ||
        "❌ ShahanFX AI وەڵامێکی دروست نەدا."
      );

      return;
    }


    // -------------------------------------------------
    // ANSWER
    // -------------------------------------------------

    if (
      !data.answer
    ) {

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


    // -------------------------------------------------
    // REFRESH LIVE DATA
    // -------------------------------------------------

    loadLiveData();

  } catch (error) {

    console.error(
      "ShahanFX AI Error:",
      error
    );


    removeTyping();


    addMessage(
      "ai",
      "❌ پەیوەندی بە ShahanFX AI نەکرا. تکایە دووبارە هەوڵ بدە."
    );

  } finally {

    isSending =
      false;


    if (sendBtn) {

      sendBtn.disabled =
        false;

      sendBtn.textContent =
        "➤ ناردن";
    }


    if (analyzeBtn) {

      analyzeBtn.disabled =
        false;
    }
  }
}


// =====================================================
// SEND BUTTON
// =====================================================

function initSendButton() {

  if (!sendBtn) {

    console.error(
      "ShahanFX: sendBtn نەدۆزرایەوە."
    );

    return;
  }


  sendBtn.addEventListener(
    "click",
    function (event) {

      event.preventDefault();

      sendMessage();

    }
  );
}


// =====================================================
// ANALYZE BUTTON
// =====================================================

function initAnalyzeButton() {

  if (!analyzeBtn) {
    return;
  }


  analyzeBtn.addEventListener(
    "click",
    function (event) {

      event.preventDefault();


      const symbol =
        symbolSelect?.value ||
        "XAU/USD";


      const timeframe =
        timeframeSelect?.value ||
        "5min";


      const question = `
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


      sendMessage(
        question
      );
    }
  );
}


// =====================================================
// QUICK BUTTONS
// =====================================================

function initQuickButtons() {

  const buttons =
    document.querySelectorAll(
      ".quick-btn"
    );


  buttons.forEach(
    button => {

      button.addEventListener(
        "click",
        function (event) {

          event.preventDefault();


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
}


// =====================================================
// ENTER TO SEND
// =====================================================

function initEnterKey() {

  if (!messageInput) {
    return;
  }


  messageInput.addEventListener(
    "keydown",
    function (event) {

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
// SYMBOL / TIMEFRAME
// =====================================================

function initSelectors() {

  if (symbolSelect) {

    symbolSelect.addEventListener(
      "change",
      function () {

        loadMarket();

      }
    );
  }


  if (timeframeSelect) {

    timeframeSelect.addEventListener(
      "change",
      function () {

        loadMarket();

      }
    );
  }
}


// =====================================================
// INITIALIZE EVERYTHING
// =====================================================

function initializeShahanFX() {

  console.log(
    "ShahanFX AI — Initializing..."
  );


  initElements();


  initImageUpload();

  initRemoveImage();

  initSendButton();

  initAnalyzeButton();

  initQuickButtons();

  initEnterKey();

  initSelectors();


  startLiveEngine();


  console.log(
    "ShahanFX AI — Ready ✓"
  );
}


// =====================================================
// DOM READY
// =====================================================

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeShahanFX
  );

} else {

  initializeShahanFX();

}
