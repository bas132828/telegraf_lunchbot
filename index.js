const { Telegraf, Markup } = require("telegraf");
require("dotenv").config();
const fetch = require("node-fetch");
const helperText = require("./constants");
const bot = new Telegraf(process.env.BOT_TOKEN);
let fetchedLunches = null;
const MONDAY = 0;
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
    console.error(e);
  }
});

bot.action("btn_weekday", async (ctx) => {
  const today = new Date().getDay() - 1;
  const cafesAndLunchesForToday = {};

  for (cafe in fetchedLunches) {
    cafesAndLunchesForToday[cafe] = fetchedLunches[cafe][today];
  }
  let html = "";
  console.log(cafesAndLunchesForToday);
  for (cafe in cafesAndLunchesForToday) {
    let text = `
    ${cafe}: ${cafesAndLunchesForToday[cafe]["meal"]}
    бонус: ${cafesAndLunchesForToday[cafe]["bonus"]}
    цена: ${cafesAndLunchesForToday[cafe]["price"]}
    `;
    html = html + text;
  }
  try {
    await ctx.answerCbQuery();
    await ctx.replyWithHTML(`<b>ланчи:</b>
    ${html}
    `);
  } catch (e) {
    console.error(e);
  }
});

bot.action("btn_cafes", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.replyWithHTML(
      "<b>Кафе</b>",
      Markup.inlineKeyboard([
        [Markup.button.callback("barrush", "btn_barrush")],
        [Markup.button.callback("proplov", "btn_proplov")],
      ])
    );
  } catch (error) {}
});

const infoForTodayFn = (info) => {
  const html = `
    ланч: <b>${info.meal}</b>
    бонусы: <b>${info.bonus}</b>
    стоимость: <b>${info.price}</b>
  `;
  return html;
};

function createCafeReply(cafe) {
  return bot.action(`btn_${cafe}`, async (ctx) => {
    let today = days[44 - 1];

    if (!today) {
      today = days[MONDAY];
      const infoForMonday = fetchedLunches[cafe].find((el) => el.day === today);
      await ctx.answerCbQuery();
      return ctx.replyWithHTML(
        `Похоже, что сегодня нет ланчей. Ближайший ланч в понедельник: ${infoForTodayFn(
          infoForMonday
        )}`
      );
    }

    const infoForToday = fetchedLunches[cafe].find((el) => el.day === today);
    try {
      await ctx.answerCbQuery();
      await ctx.replyWithHTML(`${infoForTodayFn(infoForToday)}`);
    } catch (e) {
      console.error(e);
    }
  });
}
createCafeReply("barrush");
createCafeReply("proplov");

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
