const { Telegraf, Markup } = require("telegraf");
require("dotenv").config();
const fetch = require("node-fetch");
const helperText = require("./constants");
const bot = new Telegraf(process.env.BOT_TOKEN);
let fetchedLunches = null;
const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];

fetch("https://lunch-app-bot.herokuapp.com/")
  .then((res) => res.json())
  .then((data) => {
    fetchedLunches = data;
  });
bot.start((ctx) =>
  ctx.reply(
    `Привет, ${
      ctx.message.from.first_name ? ctx.message.from.first_name : "анонимус"
    }!`
  )
);
bot.help((ctx) => ctx.reply(helperText.commands));

bot.command("lunch", async (ctx) => {
  try {
    await ctx.replyWithHTML(
      "<b>обеды</b>",
      Markup.inlineKeyboard([
        [Markup.button.callback("По всем заведениям", "btn_weekday")],
        [Markup.button.callback("Конкретное кафе", "btn_cafes")],
      ])
    );
  } catch (e) {
    console.error(e.message);
  }
});

bot.action("btn_cafes", async (ctx) => {
  try {
    await ctx.replyWithHTML(
      "<b>Кафе</b>",
      Markup.inlineKeyboard([
        [Markup.button.callback("barrush", "btn_barrush")],
        [Markup.button.callback("proplov", "btn_proplov")],
      ])
    );
  } catch (error) {}
});

const createCafeReply = (cafe) => {
  return bot.action(`btn_${cafe}`, async (ctx) => {
    const today = days[new Date().getDay() - 1];
    if (!today) return ctx.replyWithHTML(`сегодня нет ланчей!`);
    const infoForToday = fetchedLunches[cafe].find((el) => el.day === today);
    try {
      await ctx.replyWithHTML(`
          сегодня на ланч: <b>${infoForToday.meal}</b>
          бонусы: <b>${infoForToday.bonus}</b>
          стоимость: <b>${infoForToday.price}</b>
          `);
    } catch (er) {
      console.error(er.message);
    }
  });
};
createCafeReply("barrush");
createCafeReply("proplov");

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
