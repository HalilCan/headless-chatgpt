Ordered
- [+] Fix cookies for rapid login
- [+] Update and simplify selectors
- [+] Separate selectors (for increased modularity and easier updates)
- [+] Full rework (fix, simplify, refactor) and path testing.
- [] Remove superfluous paths and code.
- [] Add streaming
- [] Captcha handling
- [] Add automated testing for selectors

Unordered
- Show Shortcuts: Ctrl /
- [] Enabled/disabled detection (explicit) for model selectors
- [] Implement keyboard shortcuts where appropriate for usage alignment and future-proofing: 
    - [] New chat: Ctrl Shift O
    - [] Focus chat output: Shift Esc
    - [] Copy last code block: Ctrl Shift ;
    - [] Copy last repsonse: Ctrl Shift C
    - [] Set Custom Instructions: Ctrl Shift I
    - [] Delete Chat: Ctrl Shift Backspace
    - [] Mac compatibility
- Note: preventing element disappearance when out of focus is done through:
```
document.querySelectorAll('*').forEach(el => {
  el.onblur = null;
  el.onfocusout = null;
  el.onmouseleave = null;
});
// or:
['blur', 'focusout', 'mouseleave', 'mouseout'].forEach(eventType => {
  window.addEventListener(eventType, e => {
    e.stopImmediatePropagation();
    e.preventDefault();
  }, true); // useCapture = true to catch in capture phase
});
```