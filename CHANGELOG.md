# Changelog

# 2.0
- 2.0.0:
    - The big fix: Openai changed the chatgpt interface sufficiently to break some existing functionality. This has been fixed.
    - New: Load and select older chats up to your first chat, if desired.
    - New: Select desired GPT model from the base models (4, 3.5, and Classic) in addition to whatever GPTs you have in your recent list.
    - New: Old cookies are now purged more cleanly, preventing the case where you are erroneously asked to log-in too many times - despite already logging in a previous session.

# 1.3
- 1.3.1: Chat type selection bug fixed.
- 1.3.0: Can start new chats with model selection.

## 1.2
- 1.2.2: Version mixup fixed.
- 1.2.0: Added cookie management. You should no longer have to log in repetedly (with new sessions, that is) as long as you submit at least one query per session.

## 1.1
- 1.1.0: Chatgpt broke. I unbroke it. (some changes in the interface require the browser puppet to change its behavior)

## 1.0
- 1.0.1: More informative readme and package.json with links.
- 1.0.0: Initial release