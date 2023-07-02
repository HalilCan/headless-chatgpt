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
        return lastElem;
    });
    return result;
}

// TODO: for the captcha, look for a button with inner text "Start Puzzle"


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
    let queryString, innerHTML;
    if (context === "") {
        queryString = message + "\n";
    } else {
        queryString = message + "\n WITH THE BELOW CONTEXT: \n" + context + "\n";
    }
    const inputSelector = "TextArea";
    const answerSelector = "div .markdown";

    await inputStringInSelector(inputSelector, queryString);
    // include the \n in the string because this doesn't work for some reason.
    // okay, that didn't work too - but using type for \n twice did.
    await writeInTextArea(inputSelector, "\n");
    await writeInTextArea(inputSelector, "\n");
    await timeout(500);

    let button;
    let waitCount = 0;
    // make this a global const too
    while (waitCount < 50) {
        await timeout(500);
        button = await page.$x("//button[contains(., 'Regenerate response')]");
        if (button.length > 0) {
            let continueButton = await page.$x("//button[contains(., 'Continue generating')]");
            if (continueButton.length > 0) {
                // we don't need to do this, because the elements are merged on chatgpt's as we continue.
                // innerHTML += await getInnerHtmlOfLastElem(answerSelector);
                continueButton[0].click();
            } else {
                break;
            }
            // await button.click();
        }
        // let newReturnMd = await getInnerHtmlOfLastElem(answerSelector);
        // if (oldReturnMd.children && oldReturnMd.children.length === newReturnMd.children.length) {
        //     if (oldReturnMd.children[oldReturnMd.children.length - 1].innerText === newReturnMd.children[newReturnMd.children.length - 1].innerText) {
        //         if (oldReturnMd.children[0].innerText.length > 2) {
        //             oldReturnMd = newReturnMd;
        //             break;
        //         }
        //     }
        // }
        // oldReturnMd = newReturnMd;
        waitCount++;
    }

    // const innerHTML = oldReturnMd || await getInnerHtmlOfLastElem(answerSelector);
    innerHTML += await getInnerHtmlOfLastElem(answerSelector);
    return innerHTML;
}


module.exports = { startBrowser, visitPage, closeBrowser, type, selectElem, 
    selectElemWithIndex, writeInTextArea, getInnerHtmlOfLastElem,
    queryAi };
