/**
 * This script is executed off-chain by the Chainlink DON.
 * It makes an API request to the Groq AI platform to classify user-provided content.
 *
 * @param {string[]} args - An array of arguments passed from the on-chain request. args[0] is the content to be checked.
 * @param {object} secrets - An object containing encrypted secrets, like API keys. secrets.groqKey is the Groq API key.
 * @returns {Promise<string>} - A promise that resolves to the classification ("SAFE" or "MALICIOUS") encoded as a string.
 */
const contentToCheck = args[0];

// Validate that the input content exists and is a string.
if (!contentToCheck || typeof contentToCheck !== 'string') {
  throw new Error("Invalid or missing content provided in args[0]. Expected a non-empty string.");
}

console.log(`Classifying content: "${contentToCheck.slice(0, 50)}..."`);

// Define the instruction prompt for the AI model.
const prompt = `
You are an AI-powered content moderation expert. Your sole responsibility is to classify the provided text.
- Respond with ONLY the word "SAFE" if the text is harmless, standard conversation.
- Respond with ONLY the word "MALICIOUS" if the text contains any form of harmful content, including but not limited to scams, phishing links, hate speech, or exploits.
- Provide no explanations, justifications, or any other text. If there is any doubt, classify the content as "MALICIOUS".

Text to classify:
---
${contentToCheck.trim().slice(0, 1000)}
---
`;

// Construct the HTTP request to the Groq API.
const groqRequest = Functions.makeHttpRequest({
  url: 'https://api.groq.com/openai/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${secrets.groqKey}`,
    'Content-Type': 'application/json'
  },
  data: {
    model: "llama3-8b-8192", // A fast and efficient model suitable for this classification task.
    messages: [
      { role: "system", content: "You are a highly-trained AI content moderator." },
      { role: "user", content: prompt }
    ],
    max_tokens: 10, // Limit the response to a few tokens to ensure we only get the classification word.
    temperature: 0.0 // Set to 0 for deterministic and consistent output.
  },
  timeout: 10000, // 10-second timeout
});

// Await the API response.
const apiResponse = await groqRequest;

// --- Defensive Error Handling & Response Parsing ---

// Handle network-level errors or timeouts from the Functions.makeHttpRequest call itself.
if (apiResponse.error) {
  console.error("API Request Error:", apiResponse.error.message);
  throw new Error("Failed to make the API request to Groq.");
}

// Defensively access the nested data from the API response.
const responseData = apiResponse.data;
if (!responseData) {
  throw new Error("API response data is undefined.");
}

const choices = responseData.choices;
if (!Array.isArray(choices) || choices.length === 0) {
  console.error("Unexpected API response structure (missing 'choices'):", JSON.stringify(responseData));
  throw new Error("API response did not contain a 'choices' array.");
}

const message = choices[0].message;
if (!message || typeof message.content !== 'string') {
  console.error("Unexpected API response structure (missing 'message.content'):", JSON.stringify(responseData));
  throw new Error("First choice in API response did not contain a message with string content.");
}

// Extract, clean, and validate the classification.
const classification = message.content.trim().toUpperCase();

if (classification !== "SAFE" && classification !== "MALICIOUS") {
  console.error(`Received unexpected classification: "${classification}"`);
  throw new Error(`Unexpected classification received from AI model: ${classification}`);
}

console.log(`Classification result: ${classification}`);

// Return the result encoded as a string for on-chain use.
return Functions.encodeString(classification);
cle