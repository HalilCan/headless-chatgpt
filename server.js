const express = require('express');
const browserModule = require('./browser');

const app = express();

app.get('/start', async (req, res) => {
    await browserModule.startBrowser();
    res.send('Browser started');
});

app.get('/visit', async (req, res) => {
    if (!req.query.url) {
        res.send('Please provide a URL');
        return;
    }
    await browserModule.visitPage(req.query.url);
    res.send(`Visited ${req.query.url}`);
});

app.get('/close', async (req, res) => {
    await browserModule.closeBrowser();
    res.send('Browser closed');
});

app.listen(3000, () => console.log('Server started'));
