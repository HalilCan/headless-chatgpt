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

// 0 indexed
async function selectElemWithIndex(selector, index) {    
    return page.$$eval(selector, elems => {
        if (elems.length >= index) {
            return elems[index];
        } else {
            if (elems.length <= 1) {
                return elems;
            } else {
                return elems[elems.length - 1];
            }
        }
    });
}

async function writeInTextArea(selector, string) {
    const element = await page.focus(selector);
    await type(string);
}

async function inputStringInSelector(selector, newValue) {
    await page.waitForSelector(selector);
    const element = await page.$(selector);
    if (element) {
        await page.$eval(selector, (el, value) => el.value = value, newValue);
    } else {
        console.error(`No element found with the selector ${selector}`);
    }
}

async function evalSelect(selector) {
    const result = await page.$$eval(selector, elems => {
        return elems;
    });
    return result;
}

async function evalSelectLastElem(selector) {
    const result = await page.$$eval(selector, elems => {
        const lastElem = elems.length > 1 ? elems[elems.length - 1] : elems[0];
        console.log(lastElem);
        return lastElem;
    });
    return result;
}


async function getInnerHtmlOfLastElem(selector) {
    const result = await page.$$eval(selector, elems => {
        const lastElem = elems.length > 1 ? elems[elems.length - 1] : elems[0];
        return lastElem.innerHTML;
    });
    return result;
}

async function getInnerHtml(selector) {
    const inner_html = await page.$eval(selector, element => element.innerHTML);
    return inner_html;
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function queryAi(message, context) {
    let queryString = message + "\n WITH THE BELOW CONTEXT: \n" + context;
    const inputSelector = "TextArea";
    const answerSelector = "div .markdown";

    await inputStringInSelector(inputSelector, queryString);
    await writeInTextArea(inputSelector, "\n");

    await timeout(5000);
    const innerHTML = await getInnerHtmlOfLastElem(answerSelector);
    return innerHTML;
}


module.exports = { startBrowser, visitPage, closeBrowser, type, selectElem, 
    selectElemWithIndex, writeInTextArea, getInnerHtmlOfLastElem,
    queryAi };
