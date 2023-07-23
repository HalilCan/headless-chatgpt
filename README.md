# Headless ChatGPT

![Headless ChatGPT banner](/media/chatgpt-banner.webp)

## What is this

[Headless ChatGPT](https://www.npmjs.com/package/headless-chatgpt/) is a browser-based API emulator for ChatGPT. It is a local server that controls a `puppeteer` Chrome instance, which allows using this server like a ChatGPT API.

You do not need an API key. You just need a ChatGPT account.

In essence: I did not have API access because of a strange and persistent error, so I made my own API. Maybe it will be useful for someone else too.

## Software that use Headless ChatGPT:
- [CodeGPT Assistant](https://github.com/HalilCan/codeGPT-assistant-extension)
- [PR Assistant](https://www.youtube.com/watch?v=AgzSUK_9FoE)


## Usage

1. Start the server with `node <path-to-server.js> <preferred-port>`. This will start the puppet browser and the controller server will begin listening at the `<preferred-port>`.
2. Log in to ChatGPT and go through all pop-ups. 
3. You are ready to go.

Check the **API paths documentation** below for the API itself.

---

# API Paths Documentation
The server runs on a default port of 3000, unless specified otherwise when starting the server.

All you *really* need to get started with ChatGPT is `/queryAi` and `/retry`. Use the former to emulate 

## GET /chatgpt
This endpoint navigates the browser to the ChatGPT page.

* Response: Success message or an error message if there was a problem navigating to the ChatGPT page.

## GET /start

This endpoint starts the browser.

* Response: Success message or an error message if there was a problem starting the browser.

## GET /visit
This endpoint visits a specified URL.

* Request: URL to visit as query parameter `url`
* Response: Success message containing the visited URL or an error message if there was a problem visiting the page.

## GET /close
This endpoint closes the browser.

* Response: Success message or an error message if there was a problem closing the browser.

## POST /type
This endpoint types a string into the browser.

* Request: JSON body with a string property string
* Response: Success message containing the typed string or an error message if there was a problem typing into the browser.

## POST /select
This endpoint selects an element in the browser using the provided selector.

*  Request: JSON body with a string property selector
* Response: JSON body with the boolean result of the operation or an error message if there was a problem selecting the element.

## POST /typeInElem
This endpoint types a string into the selected element in the browser.

* Request: JSON body with properties selector and string
* Response: JSON body with the boolean result of the operation or an error message if there was a problem typing into the selected element.

## POST /getInnerHtml
This endpoint gets the inner HTML of the selected element in the browser.

* Request: JSON body with a string property selector
* Response: JSON body with the innerHtml of the selected element or an error message if there was a problem retrieving the inner HTML.


## POST /getInnerHtmlOfLast
This endpoint gets the inner HTML of the last element that matches the provided selector in the browser.

* Request: JSON body with a string property selector
* Response: JSON body with the innerHtml of the selected element or an error message if there was a problem retrieving the inner HTML.

## POST /queryAi
This endpoint queries the AI with the provided text and optional context.

* Request: JSON body with a string property text and optional context
* Response: JSON body with the AI's response text or an error message if there was a problem querying the AI.

## GET /retry
This endpoint retries the last query on the AI.

* Response: JSON body with the AI's response text or an error message if there was a problem retrying the last query.

---

## Installation instructions

1. Run `npm install headless-chatgpt`. 
1. Run `npm install` to install any missing dependencies.
2. Run `node node_modules/puppeteer/install.js` to make sure `puppeteer`'s puppet Chrome is successfully installed. This is a ~120MB download.

## How to contribute

Feel free to make pull requests or open issues in the [github repo](https://github.com/HalilCan/headless-chatgpt). A lot of new features can easily be added.