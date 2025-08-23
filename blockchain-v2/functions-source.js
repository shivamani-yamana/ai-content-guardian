// This function will be executed by Chainlink Functions
const groqKey = secrets.groqKey;

// Make HTTP request to Groq API
const groqRequest = Functions.makeHttpRequest({
  url: "https://api.groq.com/openai/v1/chat/completions",
  method: "POST",
  headers: {
    "Authorization": `Bearer ${groqKey}`,
    "Content-Type": "application/json"
  },
  data: {
    model: "llama3-8b-8192",
    messages: [
      {
        role: "system",
        content: "You are a content moderator. Classify the given content as either 'SAFE' or 'MALICIOUS'. Only respond with one of these two words."
      },
      {
        role: "user",
        content: args[0] // The content to analyze
      }
    ],
    max_tokens: 10,
    temperature: 0
  }
});

const response = await groqRequest;

if (response.error) {
  throw Error("Groq API request failed");
}

const classification = response.data.choices[0].message.content.trim().toUpperCase();

// Return only SAFE or MALICIOUS
if (classification === "SAFE" || classification === "MALICIOUS") {
  return Functions.encodeString(classification);
} else {
  return Functions.encodeString("MALICIOUS"); // Default to MALICIOUS for safety
}
