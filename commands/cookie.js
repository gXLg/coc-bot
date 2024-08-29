const resEm = require("../utils/response-emoji.js");

module.exports = async (bot, data, users) => {

  const embed = { "description": null, "color": 0x7CF2EE };
  const message = { "embeds": [embed], "flags": 64 };

  const userId = data.user?.id ?? data.member.user.id;
  const value = data.data.options?.find(o => o.name == "value").value;

  if (!value) {
    embed.description = "In order for the bot to create custom " +
      "Clashes, we kindly ask you to provide your login cookie 'rememberMe'. " +
      "This cookie will be stored in a database and will NOT be abused. " +
      "If you want to know more, visit bot's [GitHub repo](https://github.com/gXLg/coc-bot) " +
      "and verify the security for yourself.\n" +
      "To find your cookie, open Codingamer Website in your browser of choice, " +
      "open 'Developer Tools' and go to 'Storage'. From there " +
      "navigate to 'Cookies' and copy the 'rememberMe' value.";
    await bot.slash.post(data.id, data.token, message);
    return;
  }

  const m = value.match(/[0-9A-Fa-f]+/);
  if (!m) {
    embed.description = resEm(0) + "Invalid cookie format!";
    await bot.slash.post(data.id, data.token, message);
    return;
  }

  await users[userId](u => { u.cookie = value; });

  embed.description = resEm(1) + "Cookie has been set!";
  await bot.slash.post(data.id, data.token, message);
};
