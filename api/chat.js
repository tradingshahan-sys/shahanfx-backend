<div style="font-family:Arial,sans-serif;max-width:450px;margin:auto;background:#0b1329;color:#fff;padding:15px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,.3);">

  <div style="font-size:16px;font-weight:bold;margin-bottom:10px;color:#38bdf8;text-align:center;">
    ShahanFX AI Advisor
  </div>

  <div id="chat-box" style="height:320px;overflow-y:auto;border:1px solid #1e293b;padding:10px;margin-bottom:10px;border-radius:8px;background:#0f172a;display:flex;flex-direction:column;gap:8px;">

```
<div style="background:#1e293b;padding:8px 12px;border-radius:8px;max-width:80%;align-self:flex-start;color:#e2e8f0;font-size:14px;">
  سڵاو! من ڕاوێژکاری فۆرێکسەکەتەم. چۆن یارمەتیت بدەم؟
</div>
```

  </div>

  <div style="display:flex;gap:8px;">

```
<input
  type="text"
  id="user-input"
  placeholder="پرسیارەکەت لێرە بنووسە..."
  style="flex:1;padding:10px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#fff;outline:none;font-size:14px;"
  onkeydown="if(event.key==='Enter') sendMessage()"
>

<button
  id="send-button"
  onclick="sendMessage()"
  style="padding:10px 18px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;"
>
  ناردن
</button>
```

  </div>

</div>

<script>

async function sendMessage() {

  const input = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');
  const button = document.getElementById('send-button');

  const text = input.value.trim();

  if (!text) return;

  // پەیامی بەکارهێنەر
  const userMessage = document.createElement('div');

  userMessage.style.cssText =
    'background:#2563eb;padding:8px 12px;border-radius:8px;max-width:80%;align-self:flex-end;color:#fff;font-size:14px;';

  userMessage.textContent = text;

  chatBox.appendChild(userMessage);

  input.value = '';

  button.disabled = true;
  button.textContent = 'چاوەڕێ بکە...';

  chatBox.scrollTop = chatBox.scrollHeight;

  // Loading
  const loading = document.createElement('div');

  loading.style.cssText =
    'background:#1e293b;padding:8px 12px;border-radius:8px;max-width:80%;align-self:flex-start;color:#94a3b8;font-size:14px;';

  loading.textContent = 'زیرەکی دەخەریکە...';

  chatBox.appendChild(loading);

  chatBox.scrollTop = chatBox.scrollHeight;

  try {

    const res = await fetch(
      'https://shahanfx-backend-9576.vercel.app/api/chat',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          message: text
        })
      }
    );

    const data = await res.json();

    loading.remove();

    if (!res.ok || !data.success) {

      throw new Error(
        data.error || 'هەڵەیەک لە سێرڤەر ڕوویدا'
      );

    }

    // وەڵامی AI
    const brainMessage = document.createElement('div');

    brainMessage.style.cssText =
      'background:#1e293b;padding:8px 12px;border-radius:8px;max-width:80%;align-self:flex-start;color:#e2e8f0;font-size:14px;white-space:pre-wrap;';

    brainMessage.textContent =
      data.answer || 'وەڵامێک نەگەڕایەوە.';

    chatBox.appendChild(brainMessage);

  } catch (err) {

    loading.remove();

    const errorMessage = document.createElement('div');

    errorMessage.style.cssText =
      'background:#7f1d1d;padding:8px 12px;border-radius:8px;max-width:80%;align-self:flex-start;color:#fca5a5;font-size:14px;';

    errorMessage.textContent =
      'هەڵە: ' + err.message;

    chatBox.appendChild(errorMessage);

  }

  button.disabled = false;
  button.textContent = 'ناردن';

  chatBox.scrollTop = chatBox.scrollHeight;
}

</script>
