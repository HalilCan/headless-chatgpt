const express = require('express');
const axios = require('axios');
const browserModule = require('./browser');
const bodyParser = require('body-parser');
const fs = require('fs');
const he = require('he');   
// logging:
const _DEBUG = true;
const path = require('path');
const LOG_FILE = path.join(__dirname, 'debug_llm_api.txt');
// temporary:
const cors = require('cors');

function logToFile(str) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${str}\n`, 'utf8');
}

const app = express();
// temporary: (uninstall cors after done)
app.use(cors());
app.use(bodyParser.json({ limit: '100mb' }));

app.get('/chatgpt', async (req, res) => {
    try {
        await browserModule.startBrowser();
        await browserModule.visitPage("https://chat.openai.com/");
        res.send('Navigated to chatgpt');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error navigating to chatgpt');
    }
});

app.get('/start', async (req, res) => {
    try {
        await browserModule.startBrowser();
        res.send('Browser started');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error starting browser');
    }
});

app.get('/visit', async (req, res) => {
    try {
        await browserModule.visitPage(req.query.url);
        res.send(`Visited ${req.query.url}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error visiting page');
    }
    if (!req.query.url) {
        res.send('Please provide a URL');
        return;
    }
});

app.get('/close', async (req, res) => {
    try {
        await browserModule.closeBrowser();
        res.send('Browser closed');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error closing browser');
    }
});

app.get('/currentChatList', async (req, res) => {
    try {
        const list = await browserModule.getChatList();
        res.send(list);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error getting the chat list');
    }
});

app.get('/currentGptList', async (req, res) => {
    try {
        const list = await browserModule.getGptList();
        res.send(list);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error getting the gpt list');
    }
});

app.post('/loadMoreChats', async (req, res) => {
    try {
        if (!req.body.isAllChats) {
            await browserModule.loadOlderChats(false);
            res.send(`One page of older chats loaded`);
        } else {
            await browserModule.loadOlderChats(true);
            res.send(`All older chats loaded`);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading older chats');
    }
})

app.post('/type', async (req, res) => {
    try {
        if (!req.body.string) {
            res.send('Please provide a valid string to type.');
            return;
        }
        await browserModule.type(req.body.string);
        res.send(`Typed ${req.body.string}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error typing in browser');
    }
})

app.post('/select', async (req, res) => {
    try {
        if (!req.body.selector) {
            res.send('Please provide a valid selector.');
            return;
        }
        const selected = await browserModule.selectElem(req.body.selector);
        res.send({ "selected": selected });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error selecting');
    }
})

app.post('/typeInElem', async (req, res) => {
    try {
        if (!req.body.selector || !req.body.string) {
            res.send('Please provide a valid selector and string.');
            return;
        }
        const selected = await browserModule.writeInTextArea(req.body.selector, req.body.string);
        res.send({ "selected": selected });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error typing in new selection');
    }
})

app.post('/getInnerHtml', async (req, res) => {
    try {
        if (!req.body.selector) {
            res.send('Please provide a valid XPath selector.');
            return;
        }
        const innerHtml = await browserModule.getInnerHtml(req.body.selector);
        res.send({ "innerHtml": innerHtml });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error getting innerhtml');
    }
})

app.post('/getInnerHtmlOfLast', async (req, res) => {
    try {
        if (!req.body.selector) {
            res.send('Please provide a valid XPath selector.');
            return;
        }
        const innerHtml = await browserModule.getInnerHtmlOfLastElem(req.body.selector);
        res.send({ "innerHtml": innerHtml });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error getting inner html of last elem from selector');
    }
})

app.post('/queryAi', async (req, res) => {
    try {
        if (!req.body.text) {
            res.send('Please provide valid text.');
            return;
        }
        if (req.body.newChat === true) {
            const actionResponse = await startNewChat(req.body.modelName);
            if (actionResponse === -1) {
                console.error('Error in starting new chat.');
                res.status(500).send('Error in starting new chat.');
            }
        }
        let context = req.body.context ?? "";
        let extractMethod = req.body.extractMethod ?? "copy";
        let innerHtml = await browserModule.queryAi(req.body.text, context, extractMethod);
        res.send({ "text": innerHtml });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error in querying AI');
    }
})

app.post('/cancelGen', async (req, res) => {
    try {
        const browserResponse = await browserModule.cancelGeneration();
        res.send({ "text": browserResponse });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error in canceling generation');
    }
})

app.get('/retry', async (req, res) => {
    try {
        const innerHtml = await browserModule.retry();
        if (innerHtml === -1) {
            console.error(error);
            res.status(500).send('Error in retrying the last query on AI.');
        }
        res.send({ "text": innerHtml });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error in retrying the last query on AI.');
    }
})

app.post('/selectChat', async (req, res) => {
    try {
        if (!req.body.chatName) {
            res.status(500).send(`Please include chatName in your request body`);
            return;
        }
        let chatName = req.body.chatName;
        const actionResponse = await browserModule.goToChat(chatName);
        if (actionResponse === -1) {
            console.error(`Error in selecting chat: ${chatName}`);
            res.status(500).send(`Error in selecting chat: ${chatName}`);
        } else {
            res.send('Chat selected.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send(`Error in selecting existing chat.`);
    }
})

async function startNewChat (modelName="GPT-4o") {
    const actionResponse = await browserModule.newChat(modelName);
    return actionResponse;
}

app.post('/newChat', async (req, res) => {
    try {
        let modelName;
        if (!req.body.modelName) {
            modelName = "GPT-4o";
        } else {
            modelName = req.body.modelName;
        }
        const actionResponse = await startNewChat(modelName);
        if (actionResponse === -1) {
            console.error('Error in starting new chat.');
            res.status(500).send('Error in starting new chat.');
        } else {
            console.log(actionResponse);
            res.send(actionResponse);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error in starting new chat.');
    }
})

/// OLLAMA STYLE ENDPOINTS ///

// For Cline
let systemMessageKeep = true;
app.post('/api/chat', async (req, res) => {
    try {
        if (_DEBUG) {
            logToFile("\n=== Incoming /api/chat request ===");
            logToFile(JSON.stringify(req.body, null, 2));
        }

        const messages = req.body.messages;
        const model = req.body.model;
        const temperature = req.body.temperature;
        const otherKeys = Object.keys(req.body).filter(k => !['messages', 'model', 'temperature'].includes(k));

        if (_DEBUG) {
            logToFile(`Model: ${model}`);
            logToFile(`Temperature: ${temperature}`);
            if (otherKeys.length) {
                logToFile("Other keys in body: " + JSON.stringify(otherKeys));
            }
        }       

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            logToFile("Error: 'messages' missing or empty!");
            res.status(400).json({ error: "Missing or empty 'messages' array in request." });
            return;
        }
        if (!model) {
            logToFile("Error: 'model' missing!");
            res.status(400).json({ error: "Missing 'model' in request." });
            return;
        }

        // keepLast can be supplied in the request body, defaults to 1
        // TODO: Dirty handling system / assistant echo messages.
        let keepLast;
        if (systemMessageKeep) {
            keepLast = Number(req.body.keep_last ?? 2);
            systemMessageKeep = false;
        } else {
            keepLast = Number(req.body.keep_last ?? 1);
        }
        // keepLast = Number(req.body.keep_last ?? 2);


        const prompt = buildPrompt(lastNMessages(messages, keepLast));
        logToFile("\nPrompt to LLM: " + prompt);

        let responseText = await browserModule.queryAi(prompt, "");
        // responseText = responseText.replace(/\\n/g, '\n');
        responseText = he.decode(responseText)          // un-escape &lt; &gt;
            // .replace(/\\n/g, '\n');    // keep the newline fix
        // responseText = responseText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        logToFile("\nLLM response: " + responseText);

        const result = {
            "message": {
                "role": "assistant",
                content: responseText
            },
            "done": true
        };
        logToFile("\n=== Outgoing /api/chat response ===");
        logToFile(JSON.stringify(result, null, 2));

        res.json(result);

        logToFile("=== /api/chat served successfully ===\n");

    } catch (error) {
        logToFile("Error in /api/chat: " + error.toString());
        res.status(500).json({ error: 'Error generating completion' });
    }
});

/** Return up-to the last `n` messages (role/content objects). */
function lastNMessages(messages, n = 2) {
    if (!Array.isArray(messages)) return [];
    return messages.slice(-n);
}

/** Build a readable prompt from an array of role/content pairs. */
function buildPrompt(arr) {
    return arr.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
}
function buildPromptRoo(arr) {
    return arr.map(m => {
        let contentText;
        if (Array.isArray(m.content)) {
            contentText = m.content.map(c => c.text).join(' ');
        } else {
            contentText = m.content;
        }
        return `${m.role.toUpperCase()}: ${contentText}`;
    }).join('\n');
}

// For Roo:
app.post('/v1/chat/completions', async (req, res) => {
    try {
        if (_DEBUG) {
            logToFile("\n=== Incoming /api/chat request ===");
            logToFile(JSON.stringify(req.body, null, 2));
        }

        const messages = req.body.messages;
        const model = req.body.model;
        const temperature = req.body.temperature;
        const otherKeys = Object.keys(req.body).filter(k => !['messages', 'model', 'temperature'].includes(k));

        if (_DEBUG) {
            logToFile(`Model: ${model}`);
            logToFile(`Temperature: ${temperature}`);
            if (otherKeys.length) {
                logToFile("Other keys in body: " + JSON.stringify(otherKeys));
            }
        }       

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            logToFile("Error: 'messages' missing or empty!");
            res.status(400).json({ error: "Missing or empty 'messages' array in request." });
            return;
        }
        if (!model) {
            logToFile("Error: 'model' missing!");
            res.status(400).json({ error: "Missing 'model' in request." });
            return;
        }

        // keepLast can be supplied in the request body, defaults to 2
        const keepLast = Number(req.body.keep_last ?? 2);
        const prompt = buildPromptRoo(lastNMessages(messages, keepLast));
        logToFile("\nPrompt to LLM: " + prompt);

        let responseText = await browserModule.queryAi(prompt, "");
        // responseText = responseText.replace(/\\n/g, '\n');
        // responseText = he.decode(responseText)          // un-escape &lt; &gt;
            // .replace(/\\n/g, '\n');    // keep the newline fix

        logToFile("\nLLM response: " + responseText);

        const result = {
            "message": {
                "role": "assistant",
                content: responseText
            },
            "done": true
        };
        logToFile("\n=== Outgoing /api/chat response ===");
        logToFile(JSON.stringify(result, null, 2));

        res.json(result);

        logToFile("=== /api/chat served successfully ===\n");

    } catch (error) {
        logToFile("Error in /api/chat: " + error.toString());
        res.status(500).json({ error: 'Error generating completion' });
    }
});

// app.post('/v1/chat/completions', async (req, res) => {
//     } catch (error) {
//         logToFile("Error in /v1/chat/completions: " + error.toString());
//         res.status(500).json({ error: 'Error generating completion' });
//     }
// });

//////////////////////////////

/// UTILITY ///

// const formatters = {
//     // Formatter for <pre> tags
//     preFormatter: function (elem, walk, builder, formatOptions) {
//         builder.openBlock({ leadingLineBreaks: 1 });
//         builder.addInline('```\n');
//         walk(elem.children, builder);
//         builder.addInline('\n```');
//         builder.closeBlock({ trailingLineBreaks: 1 });
//     },
//     // Formatter for <li> tags
//     liFormatter: function (elem, walk, builder, formatOptions) {
//         builder.openBlock();
//         builder.addInline('- ');
//         walk(elem.children, builder);
//         builder.closeBlock();
//     }
// };

//////////////////////////////

// determine the port.
const defaultPort = 3000;
const port = process.argv[2] || defaultPort;

app.listen(port, async () => {
    console.log(`ChatGPT API server running on port ${port}`);
    const response = await axios.get(`http://localhost:${port}/chatgpt`);
});