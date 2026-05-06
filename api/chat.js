export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userMessage = req.body?.message || "";

  return res.status(200).json({
    reply: "You said: " + userMessage
  });
}

