const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "YOUR_WEBHOOK_HERE";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const lead = validateLead(req.body);

    if (N8N_WEBHOOK_URL === "YOUR_WEBHOOK_HERE") {
      return res.status(500).json({
        success: false,
        error: "N8N_WEBHOOK_URL is not configured in Vercel."
      });
    }

    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(lead)
    });
    const webhookBody = await readWebhookResponse(webhookResponse);

    if (!webhookResponse.ok) {
      console.error("n8n webhook request failed:", {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        response: webhookBody
      });

      return res.status(502).json({
        success: false,
        error: getN8nErrorMessage(webhookResponse, webhookBody)
      });
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
}

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

async function readWebhookResponse(response) {
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
  const raw = body?.raw || "";
  const message = body?.message || body?.error || raw;

  if (response.status === 404) {
    return "n8n webhook was not found. Check that the workflow is active and the URL is the Production /webhook/ URL.";
  }

  if (response.status === 500) {
    return message || "n8n workflow failed. Check your n8n execution logs, Google Sheets node, and Gmail node.";
  }

  return message || "n8n webhook request failed.";
}
