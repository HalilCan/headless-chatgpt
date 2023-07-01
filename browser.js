const puppeteer = require('puppeteer');

let browser;
let page;

async function startBrowser(){
    browser = await puppeteer.launch({
        headless: false
    });
    page = await browser.newPage();
}

async function visitPage(url){
    await page.goto(url);
}

async function closeBrowser(){
    await browser.close();
}

module.exports = { startBrowser, visitPage, closeBrowser };
