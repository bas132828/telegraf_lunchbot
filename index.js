const { Telegraf, Markup } = require("telegraf");
require("dotenv").config();
const fetch = require("node-fetch");
const helperText = require("./constants");
const bot = new Telegraf(process.env.BOT_TOKEN);
let fetchedLunches = null;
const MONDAY = 0;
const WORKING_DAYS_LENGTH = 4;
const days = ["понедельник", "вторник", "среда", "четверг", "пятница"];

fetch("https://lunch-app-bot.herokuapp.com/")
  .then((res) => res.json())
  .then((data) => {
    fetchedLunches = data;
  });
//commands
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
        [
          Markup.button.callback("По всем заведениям", "btn_weekday"),
          Markup.button.callback("Конкретное кафе", "btn_cafes"),
          Markup.button.callback("На завтра", "btn_tomorrow"),
        ],
      ])
    );
  } catch (e) {
    console.error(e);
  }
});

//actions
//start tomorrow section
bot.action("btn_tomorrow", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.replyWithHTML(
      "<b>Кафе</b>",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("По всем заведениям", "btn_weekday_tomorrow"),
          Markup.button.callback("barrush на завтра", "btn_barrush_tomorrow"),
          Markup.button.callback("proplov на завтра", "btn_proplov_tomorrow"),
        ],
      ])
    );
  } catch (e) {
    console.error(e);
  }
});

//end tomorrow section
bot.action("btn_weekday", async (ctx) => {
  let weekendFlag = false;
  let today = new Date().getDay() - 1;
  if (today > WORKING_DAYS_LENGTH) {
    weekendFlag = true;
    today = MONDAY;
  }
  const cafesAndLunchesForToday = {};

  for (cafe in fetchedLunches) {
    cafesAndLunchesForToday[cafe] = fetchedLunches[cafe][today];
  }
  if (weekendFlag) {
    await ctx.answerCbQuery();
    await ctx.replyWithHTML(
      "Похоже, сегодня нет ланчей. Ближайшие в понеделник, вот список:"
    );
  }
  for (cafe in cafesAndLunchesForToday) {
    let text = `
день: ${cafesAndLunchesForToday[cafe]["day"]}
${cafe}: ${cafesAndLunchesForToday[cafe]["meal"]}
бонус: ${cafesAndLunchesForToday[cafe]["bonus"]}
цена: ${cafesAndLunchesForToday[cafe]["price"]}
`;
    bot.hears(
      "photo",
      ctx.replyWithPhoto(
        { url: cafesAndLunchesForToday[cafe]["url"] },
        {
          caption: `${text}`,
        }
      )
    );
  }
});

bot.action("btn_cafes", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.replyWithHTML(
      "<b>Кафе</b>",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("barrush", "btn_barrush"),
          Markup.button.callback("proplov", "btn_proplov"),
        ],
      ])
    );
  } catch (e) {
    console.error(e);
  }
});

// service functions
function infoForTodayFn(info) {
  const html = `
день: ${info.day}
${info.meal}
бонусы: ${info.bonus}
стоимость: ${info.price}
  `;
  return html;
}

function createCafeReply(cafe, dayFromUser) {
  return bot.action(`btn_${cafe}`, async (ctx) => {
    //маркер tomorrow мешает поиску по базе. убираем, если есть.
    const cafeToFind = cafe.includes("_") ? cafe.split("_")[0] : cafe;
    let today;

    if (!dayFromUser) today = days[new Date().getDay() - 1];
    else if (dayFromUser === "tomorrow") today = days[new Date().getDay()];
    else today = dayFromUser;
    if (!today) {
      today = days[MONDAY];
      let infoForMonday = fetchedLunches[cafeToFind].find(
        (el) => el.day === today
      );
      await ctx.answerCbQuery();

      return bot.hears(
        "photo",
        ctx.replyWithPhoto(
          { url: infoForMonday["url"] },
          {
            caption: `
Похоже, что сегодня нет ланчей. Ближайший ланч в понедельник: 
${infoForTodayFn(infoForMonday)}`,
          }
        )
      );
    }

    const infoForToday = fetchedLunches[cafeToFind].find(
      (el) => el.day === today
    );

    try {
      await ctx.answerCbQuery();
      bot.hears(
        "photo",
        ctx.replyWithPhoto(
          { url: infoForToday["url"] },
          {
            caption: `
${infoForTodayFn(infoForToday)}`,
          }
        )
      );
    } catch (e) {
      console.error(e);
    }
  });
}

//initialization
createCafeReply("barrush");
createCafeReply("proplov");
createCafeReply("barrush_tomorrow", "tomorrow");
createCafeReply("proplov_tomorrow", "tomorrow");
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
