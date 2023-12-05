# Headless ChatGPT

![Headless ChatGPT banner](/media/chatgpt-banner.webp)

## What is this

[Headless ChatGPT](https://www.npmjs.com/package/headless-chatgpt/) is a browser-based API emulator for ChatGPT. It is a local server that controls a `puppeteer` Chrome instance, which allows using this server like a ChatGPT API.

You do not need an API key. You just need a ChatGPT account.

In essence: I did not have API access because of a strange and persistent error, so I made my own API. Maybe it will be useful for someone else too.

## Software that use Headless ChatGPT:
- [CodeGPT Assistant](https://github.com/HalilCan/codeGPT-assistant-extension)
- [PR Assistant](https://www.youtube.com/watch?v=AgzSUK_9FoE)
- [Persona Generator](https://www.youtube.com/watch?v=xQByoQW1HjM)


## Usage

1. Start the server with `node <path-to-server.js> <preferred-port>`. This will start the puppet browser and the controller server will begin listening at the `<preferred-port>`.
2. Log in to ChatGPT and go through all pop-ups. 
3. You are ready to go.

Check the **API paths documentation** below for the API itself.

---

# API Paths Documentation
The server runs on a default port of 3000, unless specified otherwise when starting the server.

All you *really* need to get started with ChatGPT are `/queryAi` and `/retry`.

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

## GET /currentChatList
This endpoint returns an array of the currently loaded chat names on the sidebar.

* Response: Either returns the list/array of past chats, or returns an error message.

## GET /currentGptList
This endpoint returns an array of the currently loaded gpt names on the sidebar, in addition to "GPT-4" and "GPT-3.5" even though they are hidden behind more clicks normally.

* Response: Either returns the list/array of recently used and available GPTs, or returns an error message.

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

## POST /newChat
This endpoint starts a new chat with the desired model or gpt. Defaults to GPT-3.5.

* Request: JSON body with a "model" string field. This must contain the name of the GPT as it appears on the recent GPTs list, or it must contain one of "GPT-4" or "GPT-3.5". For backwards compatibility, sending "3" or "4" is also fine. Refer to `GET /currentGptList` for the exact strings.
* Response: Success message or error message.

## POST /selectChat
This endpoint selects and navigates to a previous chat the link to which is currently on the sidebar.

* Request: JSON body with a "chatName" string field. This must contain the name as it appears on the sidebar, or as has been received by the `GET /currentChatList` path. In case of conflicts, go with the latter.
* Response: Success message or error message.

## POST /loadMoreChats
This endpoint loads more past chats onto the sidebar.

* Request: Optional JSON body with a "isAllChats" field. If this field exists in the request, _all_ previous chats will be loaded onto the sidebar. This is a lengthy process and may lead to natural timeouts, depending on how many you have. A single update step without that is much faster in comparison.
* Response: Success message or error message.

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
