const resEm = require("../utils/response-emoji.js");
const codingame = require("../utils/codingame.js");

module.exports = async (bot, data, servers, cocs, users, handles) => {

  const embed = { "description": null, "color": 0x7CF2EE };
  const message = { "embeds": [embed], "flags": 64 };

  const url = data.data.options.find(o => o.name == "url").value;
  const public = data.data.options.find(
    o => o.name == "public")?.value ?? false;

  const m = url.match(/https?:\/\/(?:www.)?codingame.com\/clashofcode\/clash\/([0-9a-fA-F]*)/);
  if(!m){
    embed.description = resEm(0) + "Invalid URL provided!";
    await bot.slash.post(data.id, data.token, message);
    return;
  }

  if (!data.guild_id) {
    embed.description = resEm(0) + "Clash command can only be used on servers!";
    await bot.slash.post(data.id, data.token, message);
    return;
  }

  const thisGuild = await servers[data.guild_id](e => e);
  const sendChannel = thisGuild.send_channel;
  if(!sendChannel){
    embed.description = resEm(0) + "No send channel is set up " +
      "on this guild!";
    await bot.slash.post(data.id, data.token, message);
    return;
  }

  await bot.slash.defer(data.id, data.token, { "flags": 64 });

  const clash = res.data;
  const clash = await codingame.getClash(m[1]);

  if(!clash || clash.finished){
    embed.description = resEm(0) + "This Clash does not exist " +
      "or it is already finished!";
    await bot.interactions.patch(data.token, message);
    return;
  }
  const handle = clash.publicHandle;
  if (await cocs.has(handle)) {
    embed.description = resEm(0) + "This Clash is already recorded!";
    await bot.interactions.patch(data.token, message);
    return;
  }
  await cocs.add(handle);
  embed.description = "Hosting the event...";
  await bot.interactions.patch(data.token, message);

  await codingame.watchClash(
    bot, data, thisGuild, clash,
    sendChannel, public, handle,
    cocs, users, servers, handles
  );
};
