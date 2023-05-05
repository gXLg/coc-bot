const axios = require("axios");
const resEm = require("../utils/response-emoji.js");
const fs = require("fs");
const rememberMe = fs.readFileSync(".rememberMe", "utf-8").trim();
const ownerId = fs.readFileSync(".userId", "utf-8").trim();

module.exports = async (bot, data, servers, cocs, users, handles) => {

  const embed = { "description": null, "color": 0x7CF2EE };
  const message = { "embeds": [embed], "flags": 64 };

  const res = await axios.post(
    "https://www.codingame.com/services/" +
    "ClashOfCode/createPrivateClash",
    [ownerId, ["Javascript"], ["FASTEST"]],
    {
      "headers": { "Cookie": "rememberMe=" + rememberMe }
    }
  );
  const clash = res.data;

  embed.description = "Private Clash created! Click " +
    "[join](https://www.codingame.com/clashofcode/clash/" +
    clash.publicHandle + ") to connect your account, " +
    "the Clash will expire <t:" +
    parseInt(clash.startTimestamp / 1000) + ":R>.";
  await bot.slash.post(data.id, data.token, message);

  while(true){
    await new Promise(r => setTimeout(r, 5000));
    const res = await axios.post(
      "https://www.codingame.com/services/" +
      "ClashOfCode/findClashByHandle",
      [clash.publicHandle]
    );
    const players = res.data.players;
    if(players.length > 1){
      const player = players.find(p => p.codingamerId != ownerId);
      const res = await axios.post(
        "https://www.codingame.com/services/" +
        "ClashOfCode/leaveClashByHandle",
        [ownerId, clash.publicHandle],
        {
          "headers": { "Cookie": "rememberMe=" + rememberMe }
        }
      );
      const user = data.user?.id ?? data.member.user.id;
      const handle = player.codingamerHandle;
      await users.put(user, { handle });
      await handles.put(handle, { user });

      embed.description = resEm(1) + "Logged in as [" +
        player.codingamerNickname + "](https://www.codingame.com/" +
        "profile/" + handle + ")! Be welcome and enjoy the Clashes!";
      await bot.interactions.patch(data.token, message);
      break;
    }
    if(res.data.finished || clash.startTimestamp < Date.now()){
      if(clash.startTimestamp < Date.now()){
        const res = await axios.post(
          "https://www.codingame.com/services/" +
          "ClashOfCode/leaveClashByHandle",
          [ownerId, clash.publicHandle],
          {
            "headers": { "Cookie": "rememberMe=" + rememberMe }
          }
        );
      }
      embed.description = resEm(0) + "It seems, " +
        "the Clash timed out. Please try again!";
      await bot.interactions.patch(data.token, message);
      break;
    }
  }
};
