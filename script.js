// The real n8n webhook URL is stored privately in server.js with:
// const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "YOUR_WEBHOOK_HERE";
// The browser sends lead data to this local backend route instead of exposing the webhook URL.
const LEAD_API_URL = "/lead";

async function sendMessage() {
  const input = document.getElementById("userInput");
  const chatBox = document.getElementById("chatBox");

  const message = input.value.trim();

  if (message === "") return;

  // User Message
  const userMsg = document.createElement("div");
  userMsg.className = "user-message";
  userMsg.innerText = message;
  chatBox.appendChild(userMsg);

  input.value = "";

  // Typing Message
  const typing = document.createElement("div");
  typing.className = "bot-message typing-message";
  typing.innerHTML = `
    <div class="typing-dots" aria-label="Mateen AI Assistant is typing">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
  chatBox.appendChild(typing);

  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const response = await fetch(getChatUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    typing.remove();

    addBotMessage(data.reply || "I could not read that response.");

  } catch (error) {

    typing.remove();

    addBotMessage("Error: Server not connected.");
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

async function submitLeadForm(event) {
  event.preventDefault();

  const form = event.target;
  const submitButton = document.getElementById("leadSubmitButton");
  const formData = new FormData(form);

  // Collect the exact fields your n8n workflow expects.
  const leadData = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    message: String(formData.get("message") || "").trim()
  };

  if (!leadData.name || !leadData.email || !leadData.message) {
    showLeadStatus("Please fill in all fields.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.innerText = "Sending...";
  showLeadStatus("", "");

  try {
    // Send lead information to the Express backend.
    // The backend forwards this JSON to your n8n Production Webhook.
    const response = await fetch(LEAD_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(leadData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Lead request failed");
    }

    form.reset();
    showLeadStatus(data.message || "Lead submitted successfully", "success");
  } catch (error) {
    showLeadStatus(error.message || "Sorry, the lead form failed. Please try again.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerText = "Send Lead";
  }
}

function showLeadStatus(message, type) {
  const status = document.getElementById("leadStatus");

  status.innerText = message;
  status.className = "lead-status";

  if (type) {
    status.classList.add(type);
  }
}

function getChatUrl() {
  if (window.location.protocol === "file:") {
    return "http://127.0.0.1:3000/chat";
  }

  if (window.location.hostname.includes("vercel.app")) {
    return "/api/chat";
  }

  return "/chat";
}

function addBotMessage(text) {
  const chatBox = document.getElementById("chatBox");
  const botMsg = document.createElement("div");
  botMsg.className = "bot-message";
  chatBox.appendChild(botMsg);

  typeMessage(botMsg, text);
}

function typeMessage(element, text) {
  const characters = String(text).split("");
  let index = 0;

  const interval = window.setInterval(() => {
    index += 1;
    element.textContent = characters.slice(0, index).join("");

    const chatBox = document.getElementById("chatBox");
    chatBox.scrollTop = chatBox.scrollHeight;

    if (index >= characters.length) {
      window.clearInterval(interval);
    }
  }, 18);
}

// Enter key support
document.getElementById("userInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// Lead form support for sending Name, Email, and Message to n8n.
document.getElementById("leadForm").addEventListener("submit", submitLeadForm);

// Focus input automatically
document.getElementById("userInput").focus();
