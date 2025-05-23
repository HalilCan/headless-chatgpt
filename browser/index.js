/* eslint-disable no-console */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const selectors = require('../selectors.json');

puppeteer.use(StealthPlugin());

/**
 * A singleton wrapper around Puppeteer that knows how to
 * open ChatGPT, start / switch chats and return plain-text answers.
 */
class ChatBrowser {
  /* ---------- lifecycle -------------------------------------------------- */

  /** Launch (only once). */
  async init () {
    if (this.#browser) return;
    this.#browser = await puppeteer.launch({
      headless: 'new',
      userDataDir: './chatgpt-profile',
      args: ['--no-sandbox']
    });
    this.#page = await this.#browser.newPage();
    await this.#page.setViewport({ width: 1366, height: 768 });
    await this.#page.emulateTimezone('Europe/Istanbul');
  }

  /** Graceful shutdown. */
  async close () {
    if (this.#browser) {
      await this.#browser.close();
      this.#browser = null;
      this.#page = null;
    }
  }

  /* ---------- public high-level helpers ---------------------------------- */

  /**
   * Ensure we are on https://chat.openai.com.
   * Call once at server start-up.
   */
  async openChatGpt () {
    await this.init();
    if (this.#page.url().startsWith('https://chat.openai.com')) return;
    await this.#page.goto('https://chat.openai.com');
    await this.#page.waitForSelector('textarea'); // prompt is visible
  }

  /**
   * Send a prompt and return **plain text** response.
   * @param {string} prompt Already formatted prompt
   * @returns {Promise<string>}
   */
  async ask (prompt) {
    await this.openChatGpt();

    /* 1. focus prompt box */
    const taXPath = selectors.fields.promptTextAreaDiv;
    const [box] = await this.#page.$x(taXPath);
    if (!box) throw new Error('prompt box not found');
    await box.focus();

    /* 2. fill – paste is faster than .type() for large input */
    await this.#page.evaluate((text) => {
      const ev = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer()
      });
      ev.clipboardData.setData('text/plain', text);
      document.activeElement.dispatchEvent(ev);
    }, prompt);

    /* 3. submit (double Enter to force PM to send) */
    await this.#page.keyboard.press('Enter');
    await this.#page.keyboard.press('Enter');

    /* 4. wait until streaming finished */
    await this.#page.waitForFunction(
      (stopXPath) =>
        !document.evaluate(stopXPath, document, null,
          XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
      { polling: 500, timeout: 180_000 },
      selectors.buttons.stopStreaming
    );

    /* 5. read last assistant bubble as plain text */
    const html = await this.#page.evaluate((xpath) => {
      const nodes = document.evaluate(xpath, document, null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const el = nodes.snapshotItem(nodes.snapshotLength - 1);
      return el ? el.innerHTML : '';
    }, selectors.content.responses);

    // Prefer native DOM textContent (fast & no clipboard), fallback clipboard:
    const text = html.replace(/<br\s*\/?>/gi, '\n')
                     .replace(/<\/p>\s*<p>/gi, '\n\n')
                     .replace(/<[^>]+>/g, '');

    return text.trim();
  }

  /* ---------- private fields --------------------------------------------- */

  #browser = null;
  #page = null;
}

module.exports = new ChatBrowser();
