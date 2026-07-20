// Hermes Alexa Skill — Cloudflare Pages Function
// Deployed at: https://bookiwebstudio.pages.dev/api/alexa

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
        return buildResponse("Ask me anything - what's my schedule, tell me a fun fact, or just chat.", false);
      }
      if (intent === "AMAZON.CancelIntent" || intent === "AMAZON.StopIntent") {
        return buildResponse("Goodbye!", true);
      }
      if (intent === "AskHermes") {
        const query = body.request.intent.slots?.query?.value || "";
        if (!query) return buildResponse("What would you like to ask?", false);
        
        const response = await queryHermes(query, context.env);
        return buildResponse(response, false);
      }
      return buildResponse("I did not understand that. Try again.", false);
    }

    if (type === "SessionEndedRequest") {
      return buildResponse("", true);
    }

    return buildResponse("Unknown request.", true);
  } catch (error) {
    console.error("Alexa error:", error);
    return buildResponse("Something went wrong.", true);
  }
}

async function queryHermes(query, env) {
  try {
    // Send to Hermes Telegram bot API
    const botToken = env.HERMES_TELEGRAM_BOT_TOKEN || "";
    const chatId = env.HERMES_CHAT_ID || "";
    
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: `[Alexa] ${query}` })
      });
    }
    
    return `I heard you ask about ${query}. Give me a moment to process that.`;
  } catch (e) {
    return `You asked: ${query}. I'm still learning but I'll get smarter.`;
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
