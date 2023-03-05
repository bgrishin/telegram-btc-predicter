import { askAI } from "../functions/ask-ai.function.js";

export const askAIRateLimited = (chatId, messages) => {
  const alreadyAskIndex = asks.findIndex((ask) => ask.chatId === chatId);
  if (asks[alreadyAskIndex]?.waiting) {
    asks.splice(alreadyAskIndex, 1);
  }
  return new Promise((resolve, reject) =>
    asks.push({ chatId, messages, resolve, reject, waiting: true })
  );
};

const asks = [];

const AI_INTERVAL = (1000 * 60) / 20;

const processAsks = async () => {
  const lastAsk = asks.shift();
  if (!lastAsk) {
    setTimeout(processAsks, AI_INTERVAL);
    return;
  }

  lastAsk.waiting = false;
  askAI(lastAsk.messages)
    .then((response) => lastAsk.resolve(response))
    .catch((error) => lastAsk.reject(error))
    .finally(() => setTimeout(processAsks, AI_INTERVAL));
};

setTimeout(processAsks, AI_INTERVAL);
