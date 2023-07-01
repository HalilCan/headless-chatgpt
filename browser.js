const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

let browser;
let page;

async function startBrowser(){
    browser = await puppeteer.launch({
        headless: false
    });
    page = await browser.newPage();
    await page.setViewport({
        width: 1366,
        height: 768,
        deviceScaleFactor: 1,
    });
    // await page.emulate(iPad);
    // await page.emulateTimezone("Europe/Istanbul");
    await page.emulateTimezone("America/New_York");
}

async function visitPage(url){
    await page.goto(url);
}

async function type(string) {
    await page.keyboard.type(string);
}

async function closeBrowser(){
    await browser.close();
}

async function selectElem(selector) {
    const element = await page.waitForSelector(selector);
    //
    await element.click();
    return element;
}

async function selectElemWithIndex(selector, index) {
    return page.$$(selector);
}

async function writeInTextArea(selector, string) {
    const element = await page.focus(selector);
    await type(string);
}

async function evalSelect(selector) {
    const selection = await page.$eval(selector);
    console.log(selection);
    return selection;
}

async function evalSelectLastElem(selector) {
    const selection = await evalSelect(selector);
    if (selection.length > 1) {
        return selection[selection.length - 1];
    } else {
        return selection;
    }
}

async function getInnerHtmlOfLastElem(selector) {
    const lastElem = await evalSelectLastElem(selector);
    console.log(lastElem);
    return lastElem.innerHTML;
}

async function getInnerHtml(selector) {
    const inner_html = await page.$eval(selector, element => element.innerHTML);
}

module.exports = { startBrowser, visitPage, closeBrowser, type, selectElem, selectElemWithIndex, writeInTextArea, getInnerHtmlOfLastElem };
