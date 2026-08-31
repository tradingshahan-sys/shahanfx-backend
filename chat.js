import os, zipfile

base="/mnt/data/shahanfx-gemini"
os.makedirs(base+"/api", exist_ok=True)

chat = '''export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "تەنها POST ڕێگەپێدراوە"
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY لە Vercel دانەنراوە."
      });
    }

    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);

    const message = String(body?.message || "").trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "message بەتاڵە."
      });
    }

    const model = "gemini-3.7-flash";
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const apiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `تۆ ShahanFX AI Advisor ـیت. بە کوردیی سۆرانی وەڵام بدەرەوە.\\n\\n${message}`
          }]
        }]
      })
    });

    const raw = await apiRes.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        success: false,
        error: "Gemini وەڵامی JSON ـی نەدا.",
        raw: raw.slice(0, 1000)
      });
    }

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({
        success: false,
        error: data?.error?.message || "Gemini API Error"
      });
    }

    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      return res.status(502).json({
        success: false,
        error: "Gemini وەڵامی بەتاڵی گەڕاندەوە.",
        response: data
      });
    }

    return res.status(200).json({
      success: true,
      answer: String(answer).trim()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
'''

files={
    base+"/api/gemini.js":chat,
    base+"/package.json":'''{
  "name": "shahanfx-gemini",
  "version": "1.0.0",
  "private": true
}''',
    base+"/vercel.json":'''{
  "version": 2
}'''
}

for p,c in files.items():
    with open(p,"w",encoding="utf-8") as f: f.write(c)

zip_path="/mnt/data/shahanfx-gemini.zip"
with zipfile.ZipFile(zip_path,"w",zipfile.ZIP_DEFLATED) as z:
    for p in files:
        z.write(p, os.path.relpath(p,"/mnt/data"))

print("READY:", zip_path)
