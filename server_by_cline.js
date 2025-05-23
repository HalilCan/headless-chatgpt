const express = require('express');
const axios = require('axios');
const browserModule = require('./browser');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const he = require('he');
const cors = require('cors');
// Constants
const _DEBUG = true;
const LOG_FILE = path.join(__dirname, 'debug_llm_api.txt');
const defaultPort = 3000;
const port = process.argv[2] || defaultPort;
// Log to file function
const logToFile = (str) => {
const timestamp = new Date().toISOString();
fs.appendFileSync(LOG_FILE, [${timestamp}] ${str}\n, 'utf8');
};
// Express app setup
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '100mb' }));
// Helper functions for handling responses
const handleErrorResponse = (res, errorMsg) => {
console.error(errorMsg);
res.status(500).send(errorMsg);
};
const handleSuccessResponse = (res, message) => {
res.send(message);
};
// Browser interactions (Refactored to use reusable handler functions)
const interactWithBrowser = async (action, res, successMsg, errorMsg, ...args) => {
try {
await browserModuleaction;
handleSuccessResponse(res, successMsg);
} catch (error) {
handleErrorResponse(res, errorMsg);
}
};
// Routes
app.get('/chatgpt', (req, res) => interactWithBrowser('startBrowser', res, 'Navigated to chatgpt', 'Error navigating to chatgpt', "https://chat.openai.com/"));
app.get('/start', (req, res) => interactWithBrowser('startBrowser', res, 'Browser started', 'Error starting browser'));
app.get('/visit', (req, res) => req.query.url ? interactWithBrowser('visitPage', res, Visited ${req.query.url}, 'Error visiting page', req.query.url) : res.send('Please provide a URL'));
app.get('/close', (req, res) => interactWithBrowser('closeBrowser', res, 'Browser closed', 'Error closing browser'));
// Handle the /currentChatList route
app.get('/currentChatList', async (req, res) => {
try {
const list = await browserModule.getChatList();
res.send(list);
} catch (error) {
handleErrorResponse(res, 'Error getting the chat list');
}
});
// Handle POST routes with reused helper for consistency
app.post('/loadMoreChats', async (req, res) => {
const isAllChats = req.body.isAllChats;
const loadMethod = isAllChats ? 'loadOlderChats' : 'loadOlderChats';
const successMsg = isAllChats ? 'All older chats loaded' : 'One page of older chats loaded';
interactWithBrowser(loadMethod, res, successMsg, 'Error loading older chats', isAllChats);
});
// API Chat Endpoint (Refactored)
app.post('/api/chat', async (req, res) => {
try {
const { messages, model, temperature } = req.body;
const keepLast = req.body.keep_last || 2;
if (!messages || !Array.isArray(messages) || !model) {
return res.status(400).json({ error: "Missing 'messages' or 'model' in request." });
}
javascriptCopyEdit    const prompt = buildPrompt(lastNMessages(messages, keepLast));
    logToFile(`Prompt to LLM: ${prompt}`);

    let responseText = await browserModule.queryAi(prompt, "");
    responseText = he.decode(responseText);

    const result = { "message": { "role": "assistant", content: responseText }, "done": true };
    res.json(result);
} catch (error) {
    logToFile("Error in /api/chat: " + error.toString());
    res.status(500).json({ error: 'Error generating completion' });
}

});
// Start Server
app.listen(port, async () => {
console.log(ChatGPT API server running on port ${port});
await axios.get(http://localhost:${port}/chatgpt);
});
