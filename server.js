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

app.post("/chat", (req, res) => {
  const userMessage = String(req.body?.message || "");

  res.status(200).json({
    reply: "You said: " + userMessage
  });
});

app.post("/lead", async (req, res) => {
  try {
    const lead = validateLead(req.body);
    const result = await sendLeadToN8n(lead);

    if (!result.success) {
      return res.status(result.statusCode).json(result);
    }

    return res.status(200).json({
      success: true,
      message: "Lead submitted successfully"
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || "Invalid lead data."
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
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

async function sendLeadToN8n(lead) {
  if (N8N_WEBHOOK_URL === "YOUR_WEBHOOK_HERE") {
    return {
      success: false,
      statusCode: 500,
      error: "N8N_WEBHOOK_URL is not configured."
    };
  }

  if (!N8N_WEBHOOK_URL.includes("/webhook/") || N8N_WEBHOOK_URL.includes("/webhook-test/")) {
    return {
      success: false,
      statusCode: 500,
      error: "Use the n8n Production URL with /webhook/, not /webhook-test/."
    };
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(lead)
    });
    const responseBody = await readResponseBody(response);

    if (!response.ok) {
      console.error("n8n webhook failed:", {
        status: response.status,
        statusText: response.statusText,
        response: responseBody
      });

      return {
        success: false,
        statusCode: 502,
        error: getN8nErrorMessage(response, responseBody)
      };
    }

    return {
      success: true,
      statusCode: 200
    };
  } catch (error) {
    console.error("n8n webhook network error:", error);

    return {
      success: false,
      statusCode: 502,
      error: "Could not connect to n8n webhook."
    };
  }
}

async function readResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!text) {
    return {};
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return { raw: text };
    }
  }

  return { raw: text };
}

function getN8nErrorMessage(response, body) {
  const message = body?.message || body?.error || body?.raw || "";

  if (message.includes("Unused Respond to Webhook node")) {
    return "n8n workflow error: delete or connect the unused Respond to Webhook node.";
  }

  if (response.status === 404) {
    return "n8n webhook was not found. Check that the workflow is active and the URL is the Production /webhook/ URL.";
  }

  if (response.status === 500) {
    return message || "n8n workflow failed. Check your n8n execution logs.";
  }

  return message || "n8n webhook request failed.";
}

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error("Server failed to start:", error.message);
});
