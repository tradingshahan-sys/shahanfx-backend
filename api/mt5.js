export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-api-key"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).json({ ok: true });
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      project: "ShahanFX MT5",
      status: "online",
      message: "MT5 Backend is working!"
    });
  }

  if (req.method === "POST") {
    return res.status(200).json({
      ok: true,
      project: "ShahanFX MT5",
      received: req.body || null
    });
  }

  return res.status(405).json({
    ok: false,
    error: "Method not allowed"
  });
}
