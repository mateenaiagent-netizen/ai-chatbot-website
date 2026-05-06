async function sendMessage() {
  const input = document.getElementById("userInput");
  const chatBox = document.getElementById("chatBox");
  const message = input.value.trim();

  if (message === "") return;

  const userMsg = document.createElement("div");
  userMsg.className = "user-message";
  userMsg.innerText = message;
  chatBox.appendChild(userMsg);

  input.value = "";

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

    const data = await safeReadResponse(response);

    if (!response.ok) {
      throw new Error(data.message || data.error || "Chat request failed.");
    }

    typing.remove();
    addBotMessage(data.reply || "I could not read that response.");
  } catch (error) {
    console.error("Chat request error:", error);
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

  const leadData = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    message: String(formData.get("message") || "").trim()
  };

  const validationError = validateLeadData(leadData);

  if (validationError) {
    showLeadStatus(validationError, "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.innerText = "Sending...";
  showLeadStatus("", "");

  try {
    const response = await fetch(getLeadUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(leadData)
    });

    const data = await safeReadResponse(response);

    if (!response.ok) {
      console.error("Lead API failed:", {
        status: response.status,
        statusText: response.statusText,
        response: data
      });

      throw new Error(data.message || data.error || "Webhook request failed. Please try again.");
    }

    form.reset();
    showLeadStatus(data.message || "Lead submitted successfully", "success");
  } catch (error) {
    console.error("Lead form submission error:", error);
    showLeadStatus(error.message || "Sorry, the lead form failed. Please try again.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerText = "Send Lead";
  }
}

async function safeReadResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawText);
    } catch (error) {
      console.error("Response said JSON but could not be parsed:", rawText);
      return {
        error: "Invalid JSON response from server.",
        raw: rawText
      };
    }
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    console.error("Non-JSON response received:", rawText);
    return {
      error: "Server returned a non-JSON response.",
      message: makeFriendlyHtmlError(rawText),
      raw: rawText
    };
  }
}

function makeFriendlyHtmlError(rawText) {
  if (rawText.includes("The page could not be found") || rawText.includes("Cannot GET")) {
    return "Webhook endpoint was not found. Check that your n8n Production Webhook URL is correct.";
  }

  return "Server returned an unexpected response. Please check the console for details.";
}

function validateLeadData(leadData) {
  if (!leadData.name) {
    return "Please enter your name.";
  }

  if (!leadData.email) {
    return "Please enter your email.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
    return "Please enter a valid email address.";
  }

  if (!leadData.message) {
    return "Please enter your message.";
  }

  return "";
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

function getLeadUrl() {
  if (window.location.hostname.includes("vercel.app")) {
    return "/api/lead";
  }

  return "/lead";
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

document.getElementById("userInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});

document.getElementById("leadForm").addEventListener("submit", submitLeadForm);
document.getElementById("userInput").focus();
