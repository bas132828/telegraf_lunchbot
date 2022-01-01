const { Telegraf, Markup } = require("telegraf");
require("dotenv").config();
const fetch = require("node-fetch");
const helperText = require("./constants");
const bot = new Telegraf(process.env.BOT_TOKEN);
let fetchedLunches;
const MONDAY = 0;
const WORKING_DAYS_LENGTH = 4;
const days = ["понедельник", "вторник", "среда", "четверг", "пятница"];
const buttonsArray = [];

fetch("https://lunch-app-bot.herokuapp.com/")
  .then((res) => res.json())
  .then((data) => {
    fetchedLunches = data;
  })
  .then(() => {
    //specific cafes initialization
    const arrayOfCafesForInit = [];
    for (cafe in fetchedLunches) {
      arrayOfCafesForInit.push(cafe);
    }
    arrayOfCafesForInit.forEach((el) => {
      createCafeReply(el);
      createCafeReply(`${el}_tomorrow`, "tomorrow");
    });
  })
  .then(() => {
    let tempArr = [];
    for (cafe in fetchedLunches) {
      if (tempArr.length < 2) {
        tempArr.push(Markup.button.callback(cafe, `btn_${cafe}`));
      }
      if (tempArr.length === 2) {
        buttonsArray.push([...tempArr]);
        tempArr.length = 0;
      }
    }
    if (tempArr.length) {
      buttonsArray.push([...tempArr]);
      tempArr.length = 0;
    }
  })
  .catch((er) => {
    console.error(er);
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
      "<b>обеды в Тамбове</b>",
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
bot.action("btn_tomorrow", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.replyWithHTML(
      "<b>Кафе</b>",
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "По всем заведениям завтра",
            "btn_weekday_tomorrow"
          ),
          Markup.button.callback("barrush на завтра", "btn_barrush_tomorrow"),
          Markup.button.callback("proplov на завтра", "btn_proplov_tomorrow"),
        ],
      ])
    );
  } catch (e) {
    console.error(e);
  }
});

bot.action("btn_cafes", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.replyWithHTML("<b>Кафе</b>", Markup.inlineKeyboard(buttonsArray));
  } catch (e) {
    console.error(e);
  }
});

// service functions
function createWeekDayReply(weekdayFromUser) {
  const actionMarker = weekdayFromUser ?? "";
  bot.action(`btn_weekday${actionMarker}`, async (ctx) => {
    let weekendFlag = false;

    let today;

    if (!weekdayFromUser) today = new Date().getDay() - 1;
    else if (weekdayFromUser === "_tomorrow") today = new Date().getDay();

    if (today > WORKING_DAYS_LENGTH) {
      weekendFlag = true;
      today = MONDAY;
    }
    const cafesAndLunchesForToday = {};

    let dateMarker;
    if (weekdayFromUser === "_tomorrow") dateMarker = "завтра";
    else if (weekendFlag) dateMarker = "в выходные";
    else dateMarker = "сегодня";

    const headerFroWeekend = `Похоже, ${dateMarker} нет ланчей. Ближайшие в понедельник, вот список:`;
    for (cafe in fetchedLunches) {
      cafesAndLunchesForToday[cafe] = fetchedLunches[cafe][today];
    }
    if (weekendFlag) {
      await ctx.answerCbQuery();
      await ctx.replyWithHTML(headerFroWeekend);
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
}

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

    let dateMarker;
    if (dayFromUser === "tomorrow") dateMarker = "завтра";
    else if (dayFromUser) dateMarker = "в выходные";
    else dateMarker = "сегодня";

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
Похоже, что ${dateMarker} нет ланчей. Ближайший ланч в понедельник: 
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
createWeekDayReply();
createWeekDayReply("_tomorrow");
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
