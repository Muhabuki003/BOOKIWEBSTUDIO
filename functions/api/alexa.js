// Hermes Alexa Skill — Cloudflare Pages Function
// Routes queries to NVIDIA NIM API (free, no local deps)
// "Alexa, open Hermes" → stays open, you chat back and forth

export async function onRequest(context) {
  const request = context.request;
  
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const type = body.request?.type;
    const intent = body.request?.intent?.name;

    if (type === "LaunchRequest") {
      return buildResponse("Hermes is ready. Go ahead and ask me anything.", false);
    }

    if (type === "IntentRequest") {
      if (intent === "AMAZON.HelpIntent") {
        return buildResponse("Just tell me what you need. Ask me anything, and I'll help.", false);
      }
      if (intent === "AMAZON.CancelIntent" || intent === "AMAZON.StopIntent") {
        return buildResponse("Goodbye!", true);
      }
      if (intent === "AskHermes") {
        const query = body.request.intent.slots?.query?.value || "";
        if (!query) return buildResponse("What would you like to ask?", false);
        
        const response = await askAI(query, context.env);
        return buildResponse(response, false);
      }
      return buildResponse("I didn't catch that. Try again.", false);
    }

    if (type === "SessionEndedRequest") {
      return buildResponse("", true);
    }

    return buildResponse("Unknown request.", true);
  } catch (error) {
    console.error("Alexa error:", error);
    return buildResponse("Something went wrong. Please try again.", true);
  }
}

async function askAI(query, env) {
  const apiKey = env.NVIDIA_NIM_KEY || "";
  if (!apiKey) {
    return `I heard you ask about ${query}, but I'm not connected to my brain yet. Ask Adrien to set up the API key.`;
  }

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-large-3-675b-instruct-2512",
        messages: [
          { role: "system", content: "You are Hermes, a helpful AI assistant. Respond concisely in 1-2 sentences. The user is speaking through Alexa so keep answers brief and natural for voice." },
          { role: "user", content: query }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("NIM error:", err);
      return `Sorry, I got an error. Try again later.`;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || `I heard you ask about ${query}, but I don't have an answer right now.`;
    return reply;
  } catch (e) {
    console.error("Fetch error:", e);
    return `I heard you ask about ${query}. I couldn't reach my servers.`;
  }
}

function buildResponse(text, shouldEnd) {
  return new Response(JSON.stringify({
    version: "1.0",
    response: {
      outputSpeech: {
        type: "SSML",
        ssml: `<speak>${text.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</speak>`
      },
      shouldEndSession: shouldEnd
    }
  }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
