import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "YOUR_WEBHOOK_HERE";
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/chat", (req, res) => {
  res.redirect("/");
});

app.post("/chat", async (req, res) => {
  const userMessage = req.body?.message || "";

  res.json({
    reply: "You said: " + userMessage
  });
});

app.post("/lead", async (req, res) => {
  try {
    const lead = validateLead(req.body);

    if (N8N_WEBHOOK_URL === "YOUR_WEBHOOK_HERE") {
      return res.status(500).json({
        error: "N8N_WEBHOOK_URL is not configured on the server."
      });
    }

    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(lead)
    });

    if (!webhookResponse.ok) {
      return res.status(502).json({
        error: "n8n webhook request failed."
      });
    }

    return res.status(200).json({
      message: "Lead submitted successfully"
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Invalid lead data."
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found."
  });
});

function validateLead(body) {
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim();
  const message = String(body?.message || "").trim();

  if (!name) {
    throw new Error("Name is required.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email is required.");
  }

  if (!message) {
    throw new Error("Message is required.");
  }

  return { name, email, message };
}

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error("Server failed to start:", error.message);
});
