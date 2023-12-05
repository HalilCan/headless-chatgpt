const express = require('express');
const axios = require('axios');
const browserModule = require('./browser');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

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
        res.send({"selected": selected});
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
        res.send({"selected": selected});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error typing in new selection');
    }
})

app.post('/getInnerHtml', async (req, res) => {
    try {
        if (!req.body.selector) {
            res.send('Please provide a valid selector.');
            return;
        }
        const innerHtml = await browserModule.getInnerHtml(req.body.selector);
        res.send({"innerHtml": innerHtml});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error getting innerhtml');
    }
})

app.post('/getInnerHtmlOfLast', async (req, res) => {
    try {
        if (!req.body.selector) {
            res.send('Please provide a valid selector.');
            return;
        }
        const innerHtml = await browserModule.getInnerHtmlOfLastElem(req.body.selector);
        res.send({"innerHtml": innerHtml});
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
        let context = req.body.context ?? "";
        const innerHtml = await browserModule.queryAi(req.body.text, context);
        res.send({"text": innerHtml});
        // also save cookies since we've definitely logged in.
        await browserModule.saveCookies();
    } catch (error) {
        console.error(error);
        res.status(500).send('Error in querying AI');
    }
})

app.get('/retry', async (req, res) => {
    try {
        const innerHtml = await browserModule.retry();
        if (innerHtml === -1) {
            console.error(error);
            res.status(500).send('Error in retrying the last query on AI.');            
        }
        res.send({"text": innerHtml});
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
        // console.log(`model: ${model}`);
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

app.post('/newChat', async (req, res) => {
    try {
        let model;
        if (!req.body.model) {
            model = 3;
        } else {
            model = req.body.model;
        }
        // console.log(`model: ${model}`);
        const actionResponse = await browserModule.newChat(model);
        if (actionResponse === -1) {
            console.error('Error in starting new chat.');
            res.status(500).send('Error in starting new chat.');            
        } else {
            res.send('New chat started');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error in starting new chat.');
    }
})


// determine the port.
const defaultPort = 3000;
const port = process.argv[2] || defaultPort;

app.listen(port, async () => {
    console.log(`ChatGPT API server running on port ${port}`);
    const response = await axios.get(`http://localhost:${port}/chatgpt`);
    // console.log(response.data);
});