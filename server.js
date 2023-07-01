const express = require('express');
const browserModule = require('./browser');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

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

app.post('/type', async (req, res) => {
    if (!req.body.string) {
        res.send('Please provide a valid string to type.');
        return;
    }
    await browserModule.type(req.body.string);
    res.send(`Typed ${string}`);
})

app.post('/select', async (req, res) => {
    if (!req.body.selector) {
        res.send('Please provide a valid selector.');
        return;
    }
    const selected = await browserModule.selectElem(req.body.selector);
    res.send({"selected": selected});
})

app.post('/typeInElem', async (req, res) => {
    if (!req.body.selector || !req.body.string) {
        res.send('Please provide a valid selector and string.');
        return;
    }
    const selected = await browserModule.writeInTextArea(req.body.selector, req.body.string);
    res.send({"selected": selected});
})

app.post('/getInnerHtml', async (req, res) => {
    if (!req.body.selector) {
        res.send('Please provide a valid selector.');
        return;
    }
    const innerHtml = await browserModule.getInnerHtml(req.body.selector);
    res.send({"innerHtml": innerHtml});
})

app.post('/getInnerHtmlOfLast', async (req, res) => {
    if (!req.body.selector) {
        res.send('Please provide a valid selector.');
        return;
    }
    console.log(req, res);
    const innerHtml = await browserModule.getInnerHtmlOfLastElem(req.body.selector);
    console.log(innerHtml);
    res.send({"innerHtml": innerHtml});
})

app.listen(3000, () => console.log('Server started'));
