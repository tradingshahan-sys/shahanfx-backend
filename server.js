async function sendChatMessage() {
  const input = document.getElementById("userInput");
  const chatBox = document.getElementById("chatBox");
  const text = input.value.trim();
  if(!text) return;

  // نیشاندانی پەیامی بەکارهێنەر لە چاتەکەدا
  chatBox.innerHTML += `<div style="margin-bottom:8px; text-align:left; color:#fff;"><b>تۆ:</b> ${text}</div>`;
  input.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    // ناردنی داواکاری بۆ سێرڤەرەکەت لە Vercel کە کلیلی Gemini لەوێیە
    const response = await fetch("https://shahanfx-backend-2yjs-pfad97adx-shahanfx.vercel.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await response.json();
    const reply = data.reply || data.text || "وەڵامێک لە سێرڤەرەوە نەگەڕایەوە.";

    // نیشاندانی وەڵامی زیرەکی دەستکرد
    chatBox.innerHTML += `<div style="margin-bottom:8px; text-align:right; color:#60a5fa;"><b>Brain:</b> ${reply}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // خوێندنەوەی وەڵامەکە بە دەنگ
    speakText(reply);

  } catch (error) {
    console.error(error);
    chatBox.innerHTML += `<div style="margin-bottom:8px; text-align:right; color:#f87171;"><b>Brain:</b> هەڵە ڕوویدا لە پەیوەندیکردن بە سێرڤەر.</div>`;
  }
}
