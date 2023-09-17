const axios = require("axios");
const resEm = require("../utils/response-emoji.js");

module.exports = async (bot, data, servers, cocs, users, handles, loggen) => {

  const embed = { "description": null, "color": 0x7CF2EE };
  const message = { "embeds": [embed], "flags": 64 };

  const userId = data.user?.id ?? data.member.user.id;

  const user = data.data.options?.find(
    o => o.name == "user"
  )?.value ?? userId;

  await bot.slash.defer(data.id, data.token, { "flags": 64 });

  const entry = await users[user](e => e);

  let pseudo;
  if(entry.handle){
    const res = await axios.post(
      "https://www.codingame.com/services/" +
      "CodinGamer/findCodingamePointsStatsByHandle",
      [entry.handle]
    );
    if(res.data)
      pseudo = res.data.codingamer.pseudo;
  }

  let available = "Unset";
  if(entry.available){
    const [start, end] = entry.available;

    const s = new Date();
    s.setUTCHours(parseInt(start / 60));
    s.setUTCMinutes(start % 60);
    const e = new Date();
    e.setUTCHours(parseInt(end / 60));
    e.setUTCMinutes(end % 60);

    available =
      "from <t:" + parseInt(s.valueOf() / 1000) + ":t>" +
      " to <t:" + parseInt(e.valueOf() / 1000) + ":t>";
  }

  embed.description = [
    "**User <@" + user + ">**",
    "CodinGame account: " + (
      entry.handle ? (
        pseudo ?
          "[" + pseudo + "](https://www.codingame.com/" +
            "profile/" + entry.handle + ")" :
          "(deleted)"
      ) : "Not connected"
    ),
    "Clashes played: " + entry.played_games,
    "Clashes won: " + entry.won_games,
    "Available time: " + available
  ].join("\n");
  await bot.interactions.patch(data.token, message);

};
