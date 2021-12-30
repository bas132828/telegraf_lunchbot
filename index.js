const { Telegraf, Markup } = require("telegraf");
require("dotenv").config();
const fetch = require("node-fetch");
const helperText = require("./constants");
const bot = new Telegraf(process.env.BOT_TOKEN);
let fetchedLunches = null;
const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

fetch("https://lunch-app-bot.herokuapp.com/")
  .then((res) => res.text())
  .then((data) => {
    fetchedLunches = data;
    console.log(fetchedLunches);
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
        [Markup.button.callback("Berlogovo", "btn_berrlogovo")],
        [Markup.button.callback("Bar rush", "btn_barrush")],
        [Markup.button.callback("Proplov", "btn_proplov")],
      ])
    );
  } catch (error) {}
});

bot.action("btn_berrlogovo", async (ctx) => {
  const today = days[new Date().getDay() - 1];
  let infoForToday = null;
  await fetch(`https://lunch-app-bot.herokuapp.com/${today}`)
    .then((res) => {
      return res.json();
    })
    .then((data) => {
      infoForToday = data;
    });
  try {
    await ctx.replyWithHTML(`
    сегодня на ланч: <b>${infoForToday.meal}</b>
    `);
  } catch (er) {
    console.error(er.message);
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
