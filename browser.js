// import selectors from './selectors.json' assert {type: 'json'};
const selectors = require("./selectors.json");
const models = require("./models.json");

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const _DEBUG = false;

let browser;
let page;
let lastAssistantMessages = [];  // [{id: string, content: string}]


const _currentGptModeButtonSelector = selectors.buttons.modelSwitcherDropdown;
const _generationInitialWaitLength = 500;
const _olderChatLoadTime = _generationInitialWaitLength * 6;
const _generationStartTimeout = 5000;
const _generationFinishTimeout = 200000;

async function startBrowser() {
    if (browser) return browser;
    browser = await puppeteer.launch({
        headless: false,
        userDataDir: "./headless-chatgpt-user-data",
    });
    page = await browser.newPage();
    await page.setViewport({
        width: 1366,
        height: 768,
        deviceScaleFactor: 1,
    });
    await page.emulateTimezone("America/New_York");
}

async function visitPage(url) {
    await page.goto(url);
}

async function type(string) {
    await page.keyboard.type(string);
}

async function closeBrowser() {
    await browser.close();
}

async function selectElem(selector, click = true) {
    const element = await page.waitForSelector(selector);
    //
    if (click) {
        await element.click();
    }
    return element;
}

// 0 indexed
async function selectElemWithIndex(selector, index) {
    return page.$$eval(selector, (elems) => {
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
async function writeInTextArea(
    xpathSelector,
    string,
    { isTyping = false, delay = 0 } = {}
) {
    if (!isTyping) {
        const res = await setProseMirrorContentByXPath(xpathSelector, string);
        return res;
    } else {
        const [element] = await page.$x(xpathSelector);

        if (!element) {
            console.error(`Element not found for XPath: ${xpathSelector}`);
            return;
        }
        await element.focus();

        // Trying element.type first (works on <input>, <textarea>, and some contenteditables - not with those false textarea setups, thanks Todd YouveDoneItAgain)
        try {
            await element.type(string, { delay });
        } catch (e) {
            console.warn("element.type() failed, falling back to keyboard.type()");
            await page.keyboard.type(string, { delay });
        }
    }
}

async function setProseMirrorContentByXPath(xpath, value) {
    await page.evaluate(
        (xpath, value) => {
            // Find the element by XPath
            const el = document.evaluate(
                xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;
            if (!el) return;

            el.focus();

            // Create and dispatch a synthetic paste event with your value as plain text
            const pasteEvent = new ClipboardEvent("paste", {
                bubbles: true,
                cancelable: true,
                clipboardData: new DataTransfer(),
            });
            pasteEvent.clipboardData.setData("text/plain", value);

            el.dispatchEvent(pasteEvent);
        },
        xpath,
        value
    );
}

async function inputStringInSelector(selector, newValue) {
    await page.waitForXPath(selector);
    const [element] = await page.$x(selector);
    if (element) {
        await element.evaluate((el, value) => (el.value = value), newValue);
    } else {
        console.error(`No element found with the selector ${selector}`);
    }
}

async function evalSelect(xpath) {
    const elements = await page.$x(xpath); // Returning array of ElementHandles
    return elements;
}

async function evalSelectLastElem(xpath) {
    const elements = await page.$x(xpath);
    if (elements.length === 0) return null;
    return elements[elements.length - 1];
}

async function getInnerHtml(xpath) {
    const [element] = await page.$x(xpath);
    if (!element) return null;
    return await element.evaluate((el) => el.innerHTML);
}

async function getInnerHtmlOfLastElem(xpath) {
    const actual = await getInnerHtmlOfLastElemXPath(xpath);
    return actual;
}

async function getInnerHtmlOfLastElemXPath(xpath) {
    const elements = await page.$x(xpath);
    if (elements.length === 0) return null;

    const lastElem = elements[elements.length - 1];
    const innerHtml = await lastElem.evaluate((el) => el.innerHTML);
    return innerHtml;
}

function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

// WARNING: Receiving by markdown currently uses the host's clipboard.
async function readLastResponse({ type }) {
    if (_DEBUG) {
        console.log(`copying type: ${type}`);
    }
    // const answerSelector = "div .markdown";
    if (type === "copy") {
        // to copy:
        // Ctrl + Shift + c
        await page.keyboard.down("Control");
        await page.keyboard.down("Shift");
        await page.keyboard.press("KeyC", { delay: 50 });
        await page.keyboard.up("Shift");
        await page.keyboard.up("Control");

        // to access content just copied clipboard
        await page.evaluate(() => {
            const ta = document.createElement("textarea");
            ta.id = "puppeteer-clipboard-dump";
            ta.style.position = "absolute";
            ta.style.left = "-9999px"; // hide off-screen
            document.body.appendChild(ta);
            ta.focus();
        });
        await page.keyboard.down("Control");
        await page.keyboard.press("KeyV");
        await page.keyboard.up("Control");

        const copiedContent = await page.$eval(
            "#puppeteer-clipboard-dump",
            (el) => el.value
        );

        await page.evaluate(() => {
            const ta = document.getElementById("puppeteer-clipboard-dump");
            if (ta) ta.remove();
        });

        if (_DEBUG) {
            console.log(`copiedContent: ${copiedContent}`);
        }
        // PROBLEM: ChatGPT automatically strips Cline/Roo's preferred xml/html style tags (or the <p> blocks with such tags in them - either way unworkable). So this is a no go for them. Do raw only. It could also be stripping paragraphs enclosed fully by tags.
        return copiedContent;
    } else if (type === "raw") {
        // const answerSelector = selectors.content.responses;
        // let innerHTML = await getInnerHtmlOfLastElemXPath(answerSelector);
        // return innerHTML;

        // 1. Use XPath to get all *assistant message* nodes (with data-message-id)
        const messageBlockXPath = selectors.content.messageBlocks;
        const allMessages = await page.evaluate((messageBlockXPath) => {
            function getNodesByXPath(xpath) {
                let results = [];
                let query = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                    null
                );
                for (let i = 0; i < query.snapshotLength; i++) {
                    results.push(query.snapshotItem(i));
                }
                return results;
            }
            
            function adhocTextFixer(text) {
                // Collapse <<<<<<< blocks around REPLACE/SEARCH
                text = text.replace(
                    /(?:\s*\n){7}(REPLACE|SEARCH)\s*\n(?:\s*\n){7}/g,
                    (match, p1) => `<<<<<<< ${p1}`
                );

                return text;
            }
            
            const nodes = getNodesByXPath(messageBlockXPath);
            // Use .textContent to grab plain text, which preserves custom tags-as-text
            return nodes.map(node => ({
                id: node.getAttribute('data-message-id'),
                content: adhocTextFixer(node.textContent)
            }));
        }, messageBlockXPath);

        if (_DEBUG) {
            console.log("\n\nallMessages:", allMessages);
        }

        const seenIds = new Set(lastAssistantMessages.map(m => m.id));
        let newMessages = allMessages.filter(m => !seenIds.has(m.id));

        if (_DEBUG) {
        console.log("\n\nnewMessages:", newMessages);
        }

        lastAssistantMessages = allMessages;

        if (newMessages.length) {
            return newMessages.map(m => m.content).join('\n');
        } else if (allMessages.length) {
            return allMessages[allMessages.length - 1].content;
        } else {
            return "";
        }
    }
}

function resetLastAssistantMessages() {
    lastAssistantMessages = [];
}

async function removePlanButton() {
    const [el] = await page.$x(selectors.buttons.viewPlans);

    if (el) {
        await el.evaluate((el) => el.remove());
    }
}

async function goToChat(chatName) {
    removePlanButton();
    const chatSelector =
        selectors.buttons.historyChatItem + "[contains(.,'" + chatName + "')]";
    clickResponse = clickButton(chatSelector);
    if (clickResponse === -1) {
        console.error(`Error: cannot click chat button for ${chatName}`);
        return clickResponse;
    }
    return 0;
}

async function getChatList() {
    // await loadOlderChats(false);
    const chatButtons = await page.$x(selectors.buttons.historyChatItem);
    let list = [];
    for (const button of chatButtons) {
        const text = await page.evaluate((element) => element.textContent, button);
        list.push(text.trim());
    }
    return list;
}

async function loadOlderChats(loadAllChats = false) {
    let chatCount = 0;
    let chatButtons = await page.$x(selectors.buttons.historyChatItem);
    if (chatButtons.length < 3) {
        return;
    }

    if (loadAllChats) {
        let oldChatCount = chatCount;
        chatCount = chatButtons.length;
        while (oldChatCount != chatCount) {
            const secondLastElement = chatButtons[chatButtons.length - 2];
            await page.evaluate((element) => {
                element.scrollIntoView({ behavior: "smooth", block: "end" });
            }, secondLastElement);

            await timeout(_olderChatLoadTime);
            chatButtons = await page.$x("//li[@class='relative']/div/a");
            oldChatCount = chatCount;
            chatCount = chatButtons.length;
        }
    } else {
        const secondLastElement = chatButtons[chatButtons.length - 2];
        await page.evaluate((element) => {
            element.scrollIntoView({ behavior: "smooth", block: "end" });
        }, secondLastElement);
        await timeout(_generationInitialWaitLength / 2);
    }
}

async function waitForNewChat() {
    let button = await page.$x(_currentGptModeButtonSelector);
    while (!button || button.length == 0) {
        await timeout(_generationInitialWaitLength);
        button = await page.$x(_currentGptModeButtonSelector);
    }
}

async function cancelGeneration(isWithContent) {
    const [stopButton] = await page.$x(selectors.buttons.stopStreaming);
    stopButton.click();
    if (isWithContent) {
    } else {
        return "Generation Canceled";
    }
}

// TODO: remove defaults?
async function waitForGenerationToComplete(
    generationStartTimeout = _generationStartTimeout,
    generationFinishTimeout = _generationFinishTimeout
) {
    const buttonXPath = selectors.buttons.stopStreaming;

    try {
        // Wait for the "Stop streaming" button to appear
        //   await page.waitForXPath(xpath, {
        //     timeout: generationStartTimeout,
        //     polling: 500
        //  });

        // we take the long way around instead of waitForXPath because it does not support polling and we don't want to stress low performance computers:
        await page.waitForFunction(
            (xpath) => {
                const result = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                );
                return result.singleNodeValue !== null;
            },
            {
                timeout: generationStartTimeout,
                polling: 500,
            },
            buttonXPath
        );
        if (_DEBUG) {
            console.log("Streaming has started");
        }

        // Wait for the "Stop streaming" button to disappear
        await page.waitForFunction(
            (xpath) => {
                const el = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                ).singleNodeValue;
                return el === null;
            },
            {
                timeout: generationFinishTimeout,
                polling: 1000,
            },
            buttonXPath
        );

        if (_DEBUG) {
            console.log("Streaming has stopped");
        }
        return true;
    } catch (error) {
        console.warn("Streaming did not begin or complete in expected time.");
        console.log(error);
        return false;
    }
}

// Return a string array of all available GPT models (from both dropdowns)
async function getGptList() {
    let list = [];

    // 1. Click model switcher dropdown (main list)
    if (_DEBUG) {
        console.log("[1] Clicking modelSwitcherDropdown...");
    }
    await page.waitForXPath(selectors.buttons.modelSwitcherDropdown, {
        visible: true,
    });
    const [dropdownBtn] = await page.$x(selectors.buttons.modelSwitcherDropdown);
    if (!dropdownBtn) throw new Error("modelSwitcherDropdown not found");
    await dropdownBtn.click();

    await page.waitForTimeout(350);

    // 2. Get all model buttons in the main dropdown
    if (_DEBUG) {
        console.log("[2] Getting visible model options...");
    }
    await page.waitForXPath(selectors.buttons.modelSwitcherModels, {
        visible: true,
    });
    const modelEls = await page.$x(selectors.buttons.modelSwitcherModels);
    if (modelEls.length < 1) throw new Error("No models found in main dropdown");

    // Exclude last element (the "more models" button)
    for (let i = 0; i < modelEls.length - 1; i++) {
        const rawText = await page.evaluate(
            (el) => el.innerText.trim(),
            modelEls[i]
        );
        const cleaned = rawText.split("\n")[0]; // Take only first line
        list.push(cleaned);
    }
    if (_DEBUG) {
        console.log("[3] Main dropdown models found:", list);
    }

    // 3. Click "more models" dropdown
    if (_DEBUG) {
        console.log(
            "[4] Clicking additionalModelSwitcherDropdown for more models..."
        );
    }
    await page.waitForXPath(selectors.buttons.additionalModelSwitcherDropdown, {
        visible: true,
    });
    const [moreDropdownBtn] = await page.$x(
        selectors.buttons.additionalModelSwitcherDropdown
    );
    if (!moreDropdownBtn)
        throw new Error("additionalModelSwitcherDropdown not found");
    await moreDropdownBtn.click();

    await page.waitForTimeout(350);

    // 4. Get all models in the additional models list
    if (_DEBUG) {
        console.log("[5] Getting additional model options...");
    }
    await page.waitForXPath(selectors.buttons.additionalModelsButtons, {
        visible: true,
    });
    const moreModelEls = await page.$x(selectors.buttons.additionalModelsButtons);
    for (let el of moreModelEls) {
        const rawText = await page.evaluate((el) => el.innerText.trim(), el);
        const cleaned = rawText.split("\n")[0]; // Remove second line
        list.push(cleaned);
    }
    if (_DEBUG) {
        console.log("[6] All models found (main + additional):", list);
    }

    if (_DEBUG) {
        console.log("[7] Closing modelSwitcherDropdown...");
    }
    await page.waitForXPath(selectors.buttons.modelSwitcherDropdown, {
        visible: true,
    });
    if (!dropdownBtn) throw new Error("modelSwitcherDropdown not found");
    await dropdownBtn.click();

    return list;
}

async function newChat(modelName) {
    // --- 1. Click ChatGPT button on the sidebar ---
    if (_DEBUG) {
        console.log("[1] Waiting for sidebar button...");
    }
    await page.waitForXPath(selectors.buttons.sidebarCreateNewChat, {
        visible: true,
    });
    const [toolbarBtn] = await page.$x(selectors.buttons.sidebarCreateNewChat);
    if (!toolbarBtn) throw new Error("ChatGPT toolbar button not found");
    if (_DEBUG) {
        console.log("[2] Clicking ChatGPT sidebar button...");
    }
    await toolbarBtn.click();

    // --- 2. Wait for splash screen ---
    if (_DEBUG) {
        console.log("[3] Waiting for splash screen...");
    }
    await page.waitForXPath(selectors.content.splashScreenText, {
        visible: true,
    });

    if (modelName) {
        // --- Normalize and debug input ---
        const modelNameTrimmed = modelName.trim();
        const modelNameLower = modelNameTrimmed.toLowerCase();
        if (_DEBUG) {
            console.log(
                `[4] Model requested: "${modelNameTrimmed}" (normalized: "${modelNameLower}")`
            );
        }

        // --- Prepare and log available model names ---
        const allModels = models.fullList.map((m) => m.trim().toLowerCase());
        const basicModelsLower = models.basicModelsList.map((m) =>
            m.trim().toLowerCase()
        );
        const moreModelsLower = models.moreModelsList.map((m) =>
            m.trim().toLowerCase()
        );
        if (_DEBUG) {
            console.log("[5] allModels:", allModels);
        }
        if (_DEBUG) {
            console.log("[6] basicModelsLower:", basicModelsLower);
        }
        if (_DEBUG) {
            console.log("[7] moreModelsLower:", moreModelsLower);
        }

        // --- Model must match exactly, case-insensitive ---
        const foundIndex = allModels.indexOf(modelNameLower);
        if (foundIndex === -1) {
            throw new Error(`Model "${modelNameTrimmed}" not found in fullList`);
        }
        const canonicalModelName = models.fullList[foundIndex];
        if (_DEBUG) {
            console.log(`[8] Canonical model name: "${canonicalModelName}"`);
        }

        // --- Assign isBasic / isMore without else/if chain ---
        const isBasic = basicModelsLower.includes(modelNameLower);
        const isMore = moreModelsLower.includes(modelNameLower);
        if (_DEBUG) {
            console.log(`[9] isBasic: ${isBasic}, isMore: ${isMore}`);
        }

        if (!isBasic && !isMore) {
            throw new Error(
                `Model "${modelNameTrimmed}" not in basicModelsList or moreModelsList`
            );
        }

        // --- 5. Always first click modelSwitcherDropdown ---
        if (_DEBUG) {
            console.log("[10] Waiting for and clicking model switcher dropdown...");
        }
        await page.waitForXPath(selectors.buttons.modelSwitcherDropdown, {
            visible: true,
        });
        const [modelSwitcherBtn] = await page.$x(
            selectors.buttons.modelSwitcherDropdown
        );
        if (!modelSwitcherBtn) throw new Error("Model switcher dropdown not found");
        await modelSwitcherBtn.click();

        // --- 6. Wait for dropdown to open ---
        if (_DEBUG) {
            console.log("[11] Waiting for dropdown to render...");
        }
        await page.waitForTimeout(350);

        if (isBasic) {
            // --- 6/7. Get the button for the model and click ---
            const basicButtonXPath =
                `${selectors.buttons.modelSwitcherModels}` +
                `[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${modelNameLower}')]`;
            if (_DEBUG) {
                console.log(
                    `[12] Looking for basic model button with XPath: ${basicButtonXPath}`
                );
            }
            await page
                .waitForXPath(basicButtonXPath, { visible: true, timeout: 2000 })
                .catch(() => {
                    console.error(`[12a] Timeout waiting for basic model button`);
                });
            await page.waitForTimeout(200);
            const [modelBtn] = await page.$x(basicButtonXPath);
            if (!modelBtn) {
                console.error(`[12b] Basic model button not found`);
                throw new Error(
                    `Basic model button for "${canonicalModelName}" not found`
                );
            }
            if (_DEBUG) {
                console.log("[13] Clicking basic model button...");
            }
            await modelBtn.click();
            await page.waitForTimeout(500);

            const [modelSwitcher] = await page.$x(
                selectors.buttons.modelSwitcherDropdown
            );
            const modelText = await page.evaluate(
                (el) => el.innerText,
                modelSwitcher
            );
            if (_DEBUG) {
                console.log(
                    `[14] Current model switcher dropdown text: "${modelText}"`
                );
            }
            return `New chat started. Current model: ${modelText}`;
        }

        // --- 8. If not basic, click additionalModelSwitcherDropdown ---
        if (_DEBUG) {
            console.log(
                "[15] Waiting for and clicking additional model switcher dropdown..."
            );
        }
        await page.waitForXPath(selectors.buttons.additionalModelSwitcherDropdown, {
            visible: true,
        });
        const [additionalSwitcherBtn] = await page.$x(
            selectors.buttons.additionalModelSwitcherDropdown
        );
        if (!additionalSwitcherBtn)
            throw new Error("Additional model switcher dropdown not found");
        await additionalSwitcherBtn.click();

        // --- 9. Wait for additional dropdown to open ---
        if (_DEBUG) {
            console.log("[16] Waiting for additional dropdown to render...");
        }
        await page.waitForTimeout(350);

        // --- 9/10. Find and click the button for the 'more' model ---
        const moreButtonXPath =
            `${selectors.buttons.additionalModelsButtons}` +
            `[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${modelNameLower}')]`;
        if (_DEBUG) {
            console.log(
                `[17] Looking for more model button with XPath: ${moreButtonXPath}`
            );
        }
        await page
            .waitForXPath(moreButtonXPath, { visible: true, timeout: 2000 })
            .catch(() => {
                console.error(`[17a] Timeout waiting for more model button`);
            });
        await page.waitForTimeout(200);
        const [moreModelBtn] = await page.$x(moreButtonXPath);
        if (!moreModelBtn) {
            console.error(`[17b] More model button not found`);
            throw new Error(
                `More model button for "${canonicalModelName}" not found`
            );
        }

        if (_DEBUG) {
            console.log("[18] Clicking more model button...");
        }
        await moreModelBtn.click();

        await page.waitForTimeout(500);
        const [modelSwitcher] = await page.$x(
            selectors.buttons.modelSwitcherDropdown
        );
        const modelText = await page.evaluate((el) => el.innerText, modelSwitcher);
        if (_DEBUG) {
            console.log(`[19] Current model switcher dropdown text: "${modelText}"`);
        }

        return `New chat started. Current model: ${modelText}`;
    }

    if (_DEBUG) {
        console.log("[20] No modelName provided; finished after splash screen.");
    }
    // Done
}

async function retry(isWebSearch) {
    // Step 0: Scroll to the bottom of chat to create the buttons.
    await scrollToBottomOfXPath({ xpath: selectors.content.bigChatContainer });

    // Step 1: Mouseover the last response chat toolbar
    const [toolbarEl] = await page.$x(selectors.buttons.lastResponseChatToolbar);
    if (!toolbarEl) {
        throw new Error(
            `Toolbar not found: ${selectors.buttons.lastResponseChatToolbar}`
        );
    }
    await toolbarEl.hover();
    await page.waitForTimeout(500); // Adjust if your fade-in is faster/slower

    // Step 2: Click model changer button
    const [modelChangerEl] = await page.$x(
        selectors.buttons.lastMessageModelChanger
    );
    if (!modelChangerEl) {
        throw new Error(
            `Model changer button not found: ${selectors.buttons.lastMessageModelChanger}`
        );
    }
    await modelChangerEl.click();
    await page.waitForTimeout(300); // Give time for menu animation

    // Step 3: Try to click regenerate (websearch or normal)
    let regenerateEl = null;

    const [regenWebSearchEl] = await page.$x(
        selectors.buttons.regenerateLastMessageWithWebSearch
    );
    if (isWebSearch) {
        if (regenWebSearchEl) {
            regenerateEl = regenWebSearchEl;
        } else {
            const [regenNormalEl] = await page.$x(
                selectors.buttons.regenerateLastMessage
            );
            if (regenNormalEl) {
                regenerateEl = regenNormalEl;
            }
        }
    } else {
        const [regenNormalEl] = await page.$x(
            selectors.buttons.regenerateLastMessage
        );
        if (regenNormalEl) {
            regenerateEl = regenNormalEl;
        }
    }

    if (!regenerateEl) {
        throw new Error(
            "Neither websearch nor normal regenerate button found: " +
            websearchSelector +
            " / " +
            selectors.buttons.regenerateLastMessage
        );
    }
    await regenerateEl.click();

    // Step 4: Wait for generation, read response, debug log if needed
    const generationSuccess = await waitForGenerationToComplete();
    if (!generationSuccess) {
        return "Error: Retry generation did not complete successfully";
    }

    let innerHTML = await readLastResponse({ type: "raw" });

    if (_DEBUG) {
        console.log(innerHTML);
    }
    return innerHTML;
}

async function scrollToBottomOfXPath({
    xpath,
    timeout = 10000,
    scrollDelay = 500,
    maxAttempts = 10,
}) {
    if (!xpath) throw new Error("You must provide an XPath selector.");

    // Wait for the element to appear
    await page.waitForXPath(xpath, { timeout });

    const elements = await page.$x(xpath);
    if (elements.length === 0) {
        throw new Error(`No elements found for XPath: ${xpath}`);
    }

    const container = elements[0];

    await page.evaluate(
        async (el, scrollDelay, maxAttempts) => {
            const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
            let previousHeight = 0;
            let attempts = 0;

            while (el.scrollHeight !== previousHeight && attempts < maxAttempts) {
                previousHeight = el.scrollHeight;
                el.scrollTop = el.scrollHeight;
                await sleep(scrollDelay);
                attempts++;
            }
        },
        container,
        scrollDelay,
        maxAttempts
    );
}

async function queryAi(message, context, extractMethod = "raw") {
    let queryString, innerHTML;
    if (context === "") {
        queryString = message + "\n";
    } else {
        queryString = message + "\n WITH THE CONTEXT BELOW: \n" + context + "\n";
    }
    const inputSelector = selectors.fields.promptTextAreaDiv;

    await writeInTextArea(inputSelector, queryString);
    await page.keyboard.press('Enter');
    // the above manual / type switch-up is due to how they set ProseMirror up. Sunk it.
    // [TODO switch with clicking the button?]

    const generationSuccess = await waitForGenerationToComplete();
    if (!generationSuccess) {
        return "Error: Generation did not complete successfully";
    }

    innerHTML = await readLastResponse({ type: extractMethod });

    if (_DEBUG) {
        console.log(innerHTML);
    }
    return innerHTML;
}


module.exports = {
    startBrowser,
    visitPage,
    closeBrowser,
    type,
    selectElem,
    selectElemWithIndex,
    writeInTextArea,
    getInnerHtmlOfLastElem,
    queryAi,
    retry,
    newChat,
    loadOlderChats,
    getGptList,
    getChatList,
    goToChat,
    cancelGeneration,
    resetLastAssistantMessages
};
