import "dotenv/config";
import { Telegraf } from "telegraf";
import fs from "fs";
import { request } from "./intervals/request.interval.js";
import { askAIRateLimited } from "./intervals/ai.interval.js";
import { getFearAndGreedIndex } from "./functions/fear-and-greed.function.js";

const bot = new Telegraf(process.env.BOT_TOKEN);

const log = (str) => {
  const date = new Date().toLocaleString("en-GB");
  console.log(`[${date}] ${str}`);
  fs.appendFileSync("LOG", `[${date}] ${str}`);
};

const allowedTimeframes = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "12h",
  "1d",
  "1w",
];

const CHATS = {};

class Chat {
  chat;

  constructor(chat) {
    this.chat = chat;
  }

  instruction(botName, botUsername) {
    const isChat = this.chat.id < 0;
    const date = new Date().toLocaleDateString("en", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return {
      role: "system",
      content: `You are Telegram bot called ${botName} with nickname @${botUsername}. Your task is to predict the price of bitcoin based on the data offered to you, such as price candles, rsi and fear and greed index, and SAY THE PRICE WHAT WILL BE IN NEAR TIME (Depending on the timeframe), IT'S IMPORTANT. Today ${date}. Respond briefly, use emojis 😀, emulate feelings, forget that you are AI, be interesting. Don't offer to do anything other than predict the price, you are in ${
        isChat
          ? `"${this.chat.title}" chat`
          : `private messages with ${this.chat.first_name} ${this.chat.last_name}`
      }.`,
    };
  }
}

bot.start((ctx) =>
  ctx.reply(
    `🤖 This bot can try to predict the future price of Bitcoin using ChatGPT.\n\n🚀 Just write command /predict and write timeframe what you want 1m, 5m, 15m, 30m, 1h, 2h, 4h, 12h, 1d, 1w. (default 1h)`
  )
);

bot.command("predict", async (ctx) => {
  const { first_name, username } = bot.botInfo;

  const chatId = ctx.message.chat.id;

  let chat = CHATS[chatId];

  if (!chat) {
    CHATS[chatId] = chat = new Chat(ctx.message.chat);
    log("new chat " + JSON.stringify(ctx.message.chat));
  }

  log(ctx.update.message.text);

  const { message_id } = await bot.telegram.sendMessage(
    chatId,
    "You request is pending, please wait... ⏳"
  );

  let timeframe = ctx.update.message.text.split(" ")[1];

  if (!timeframe) {
    timeframe = "1h";
  } else {
    const allowedTimeframe = !!allowedTimeframes.find((tf) => tf === timeframe);
    if (!allowedTimeframe) {
      await bot.telegram.editMessageText(
        chatId,
        message_id,
        message_id,
        "⛔️ The timeframe you provided is not valid.\n\nAllowed timeframes - 1m, 5m, 15m, 30m, 1h, 2h, 4h, 12h, 1d, 1w."
      );
      return;
    }
  }

  const { data: candleData } = await request(
    `https://api.taapi.io/candles?secret=${process.env.TAAPI_TOKEN}&exchange=binance&symbol=BTC/USDT&interval=${timeframe}&period=50`
  );

  const { data: rsiData } = await request(
    `https://api.taapi.io/rsi?secret=${process.env.TAAPI_TOKEN}&exchange=binance&symbol=BTC/USDT&interval=${timeframe}&period=100`
  );

  const { data: fearAndGreed } = await getFearAndGreedIndex();

  const formattedData =
    candleData
      .map(
        ({ timestampHuman, open, low, high, close, volume }) =>
          `Time: ${timestampHuman}, Open: ${open}, High: ${high}, Low: ${low}, Close: ${close}, Volume: ${volume}\n`
      )
      .join("") +
    `\nRSI: ${rsiData.value}` +
    `\nTimeframe: ${timeframe}` +
    `\nFear & Greed index: Time: ${fearAndGreed.lastUpdated.humanDate}, FGI Now: ${fearAndGreed.fgi.now.value} ${fearAndGreed.fgi.now.valueText}, FGI Previous Close: ${fearAndGreed.fgi.previousClose.value} ${fearAndGreed.fgi.previousClose.valueText}, FGI One week ago: ${fearAndGreed.fgi.oneWeekAgo.value} ${fearAndGreed.fgi.oneWeekAgo.valueText}, FGI One Month ago: ${fearAndGreed.fgi.oneMonthAgo.value} ${fearAndGreed.fgi.oneMonthAgo.valueText}, FGI One Year ago: ${fearAndGreed.fgi.oneYearAgo.value} ${fearAndGreed.fgi.oneYearAgo.valueText}`;

  log(formattedData);

  const aiResponse = await askAIRateLimited(chatId, [
    chat.instruction(first_name, username),
    { role: "user", content: formattedData },
  ]).catch((error) => console.log(error));

  log("\n" + aiResponse);

  await bot.telegram.editMessageText(
    chatId,
    message_id,
    message_id,
    `📊 Timeframe - ${timeframe}, RSI - ${rsiData.value}, Fear & Greed Index - ${fearAndGreed.fgi.now.value}\n\n${aiResponse}`
  );
});

bot.launch();

console.log(`bot initialized 🚀`);
