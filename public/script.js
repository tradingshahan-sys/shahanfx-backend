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

    const message = document.createElement("div");

    message.className =
      type === "user"
        ? "message user-message"
        : "message ai-message";


    const content = document.createElement("div");

    content.className = "message-content";

    content.textContent = text;


    message.appendChild(content);

    chatBox.appendChild(message);

    chatBox.scrollTop = chatBox.scrollHeight;
  }


  function setLoading(loading) {

    sendBtn.disabled = loading;

    if (loading) {

      sendBtn.dataset.oldText =
        sendBtn.textContent;

      sendBtn.textContent = "⏳";

    } else {

      sendBtn.textContent =
        sendBtn.dataset.oldText || "➤ ناردن";

    }
  }


  async function sendMessage() {

    const message =
      messageInput.value.trim();


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

      const formData =
        new FormData();


      formData.append(
        "message",
        message
      );


      if (selectedImage) {

        formData.append(
          "image",
          selectedImage
        );

      }


      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",
            body: formData
          }
        );


      const raw =
        await response.text();


      let data;


      try {

        data =
          JSON.parse(raw);

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


      addMessage(
        answer,
        "bot"
      );


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

    }


    setLoading(false);

    messageInput.focus();

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


  sendBtn.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      sendMessage();

    }
  );


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
          !file.type.startsWith(
            "image/"
          )
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


  if (removeImage) {

    removeImage.addEventListener(
      "click",
      clearImage
    );

  }


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


          if (!question) {
            return;
          }


          messageInput.value =
            question;

          messageInput.focus();

        }
      );

    });


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

        const last =
          data.values[
            data.values.length - 1
          ];


        const price =
          Number(last.close);


        if (Number.isFinite(price)) {

          livePrice.textContent =
            price.toFixed(
              price > 100
                ? 2
                : 5
            );

        }


        liveBias.textContent =
          calculateBias(
            data.values
          );

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

      livePrice.textContent =
        "—";

      liveBias.textContent =
        "WAIT";

    }

  }


  function calculateBias(values) {

    if (
      !Array.isArray(values) ||
      values.length < 2
    ) {

      return "WAIT";

    }


    const last =
      Number(
        values[
          values.length - 1
        ].close
      );


    const previous =
      Number(
        values[
          values.length - 2
        ].close
      );


    if (
      !Number.isFinite(last) ||
      !Number.isFinite(previous)
    ) {

      return "WAIT";

    }


    if (last > previous) {
      return "BULLISH";
    }


    if (last < previous) {
      return "BEARISH";
    }


    return "WAIT";

  }


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

        newsCount.textContent =
          "—";

      }

    } catch (error) {

      console.error(
        "News Error:",
        error
      );

      newsCount.textContent =
        "—";

    }

  }


  if (analyzeBtn) {

    analyzeBtn.addEventListener(
      "click",
      async () => {

        const symbol =
          symbolSelect.value;


        messageInput.value =
          `${symbol} بە داتای Live شیکاری بکە. Market Structure، Liquidity، FVG، Order Block، News و Bias بپشکنە.`;

        await sendMessage();

      }
    );

  }


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
