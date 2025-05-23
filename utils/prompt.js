/**
 * Convert an OpenAI-style messages array into a readable prompt.
 * Prevents the double-escaping bug because nothing is JSON-stringified.
 */
function buildPrompt (messages) {
  return messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
}

module.exports = { buildPrompt };
