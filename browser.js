const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

let browser;
let page;

const _regenButtonXPathSelector = "//button[contains(., 'Regenerate') or contains(., 'Regenerate response')]";
const _continueButtonXPathSelector = "//button[contains(., 'Continue generating') or contains(., 'Continue')]";
const _maxWaitCount = 100;
const _generationWaitStepLength = 500;
const _generationInitialWaitLength = 500;

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

async function clickButton(selector) {
    let buttons = await page.$x(selector);
    if (buttons.length > 0) {
        buttons[0].click();
        return 0;
    } else {
        return -1;
    }
}

async function readLastResponse() {
    const answerSelector = "div .markdown";
    let innerHTML = await getInnerHtmlOfLastElem(answerSelector);
    return innerHTML;
}

async function waitForGenerationToComplete() {
    // console.log("enter generation waiter");
    let button;
    let waitCount = 0;
    // sometimes our query doesn't "take" quickly, and the regenerate button from the last time around stays. This waits until that is done.
    button = await page.$x(_regenButtonXPathSelector);
    if (button && button.length > 0) {
        // console.log("first generation wait loop");
        while (button && button.length > 0) {
            // console.log("first generation inner loop, button:", button);
            await timeout(_generationInitialWaitLength);
            button = await page.$x(_regenButtonXPathSelector); 
        }
    }
    await timeout(_generationWaitStepLength / 2);

    // this just waits until the next regenerate button (which appears at the end of AI output) appears. If continue does so too, we press that and wait until done.
    while (waitCount < _maxWaitCount) {
        // console.log(`second generation wait loop : ${waitCount} / ${_maxWaitCount}`);
        await timeout(_generationWaitStepLength);
        button = await page.$x(_regenButtonXPathSelector);
        if (button.length > 0) {
            await timeout(_generationWaitStepLength);
            let continueButton = await page.$x(_continueButtonXPathSelector);
            if (continueButton.length > 0) {
                // TODO: Should this reset waitCount? Adverse behavior?
                waitCount = 0;
                continueButton[0].click();
            } else {
                break;
            }
        }
        waitCount++;
    }
}

async function retry() {
    let innerHTML;
    const buttonXPathSelector = _regenButtonXPathSelector;
    const clickResponse = await clickButton(buttonXPathSelector);
    if (clickResponse === -1) {
        return clickResponse;
    }
    // TODO: I think in case of errors that need regeneration, they disable the input box. Wait and see.
    await waitForGenerationToComplete();
    innerHTML = await readLastResponse();
    return innerHTML;
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
    // console.log("the long wait beginn");
    
    await waitForGenerationToComplete();
    
    // console.log("the long wait ENDS");

    // const innerHTML = oldReturnMd || await getInnerHtmlOfLastElem(answerSelector);
    innerHTML += await getInnerHtmlOfLastElem(answerSelector);
    // console.log(innerHTML);
    return innerHTML;
}


module.exports = { startBrowser, visitPage, closeBrowser, type, selectElem, 
    selectElemWithIndex, writeInTextArea, getInnerHtmlOfLastElem,
    queryAi, retry };
