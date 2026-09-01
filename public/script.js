document.addEventListener("DOMContentLoaded", () => {

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

  function addMessage(text, type = "bot") {
    const div = document.createElement("div");

    div.className =
      type === "user"
        ? "message user-message"
        : "message ai-message";

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
      sendBtn.textContent = "⏳";
    } else {
      sendBtn.textContent = "➤ ناردن";
    }
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);

      reader.readAsDataURL(file);
    });
  }

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

  async function sendMessage() {

    const message = messageInput.value.trim();

    if (!message && !selectedImage) {
      messageInput.focus();
      return;
    }

    addMessage(
      message || "📷 شیکردنەوەی وێنەی Chart",
      "user"
    );

    messageInput.value = "";

    setLoading(true);

    try {

      let image = null;

      if (selectedImage) {
        image = await fileToDataURL(selectedImage);
      }

      const payload = {
        message,
        image,
        symbol: symbolSelect?.value || "XAU/USD",
        interval: timeframeSelect?.value || "5min"
      };

      const response = await fetch("/api/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(payload)
      });

      const raw = await response.text();

      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          "وەڵامی Backend ـەکە JSON نییە."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
          `HTTP ${response.status}`
        );
      }

      if (data.ok === false) {
        throw new Error(
          data.error ||
          "Backend هەڵەیەکی گەڕاندەوە."
        );
      }

      const answer =
        data.answer ||
        data.message ||
        data.response ||
        data.text;

      if (!answer) {
        throw new Error(
          "وەڵامی AI بەتاڵە."
        );
      }

      addMessage(answer, "bot");

      clearImage();

    } catch (error) {

      console.error(
        "ShahanFX AI Error:",
        error
      );

      addMessage(
        "❌ کێشەیەک ڕوویدا:\n" +
        error.message,
        "bot"
      );

    } finally {

      setLoading(false);
      messageInput.focus();

    }
  }

  // =========================
  // SEND BUTTON
  // =========================

  if (sendBtn) {
    sendBtn.addEventListener("click", (event) => {
      event.preventDefault();
      sendMessage();
    });
  }

  // =========================
  // ENTER
  // =========================

  if (messageInput) {
    messageInput.addEventListener("keydown", (event) => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        sendMessage();
      }

    });
  }

  // =========================
  // CHART IMAGE
  // =========================

  if (imageInput) {

    imageInput.addEventListener("change", (event) => {

      const file = event.target.files?.[0];

      if (!file) {
        clearImage();
        return;
      }

      if (!file.type.startsWith("image/")) {

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
        imagePreview.classList.remove("hidden");
      }

    });

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

      button.addEventListener("click", () => {

        const question =
          button.dataset.question ||
          button.dataset.message ||
          button.textContent.trim();

        if (!question) return;

        messageInput.value = question;
        messageInput.focus();

      });

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

      const response = await fetch(
        `/api/market?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`
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

        // Twelve Data returns newest candle first
        const current =
          data.values[0];

        const previous =
          data.values[1];

        const price =
          Number(current?.close);

        if (Number.isFinite(price)) {

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

          if (currentClose > previousClose) {
            liveBias.textContent = "BULLISH";
          } else if (currentClose < previousClose) {
            liveBias.textContent = "BEARISH";
          } else {
            liveBias.textContent = "WAIT";
          }

        } else {
          liveBias.textContent = "WAIT";
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

      livePrice.textContent = "—";
      liveBias.textContent = "WAIT";
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
          `/api/news?from=${today}&to=${today}`
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

        newsCount.textContent = "—";

      }

    } catch (error) {

      console.error(
        "News Error:",
        error
      );

      newsCount.textContent = "—";
    }
  }

  // =========================
  // LIVE ANALYSIS BUTTON
  // =========================

  if (analyzeBtn) {

    analyzeBtn.addEventListener(
      "click",
      () => {

        const symbol =
          symbolSelect?.value ||
          "XAU/USD";

        messageInput.value =
          `${symbol} بە داتای Live شیکاری بکە. Market Structure، Liquidity، FVG، Order Block، News و Bias بپشکنە.`;

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
    "✅ ShahanFX AI Chat READY"
  );

});
