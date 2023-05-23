const resEm = require("../utils/response-emoji.js");

module.exports = async (bot, data, servers, cocs, users, handles, loggen) => {

  const embed = { "description": null, "color": 0x7CF2EE };
  const message = { "embeds": [embed], "flags": 64 };

  const send_channel = data.data.options?.find(
    o => o.name == "send_channel"
  )?.value ?? null;
  const playing_role = data.data.options?.find(
    o => o.name == "playing_role"
  )?.value ?? null;
  const ping_role = data.data.options?.find(
    o => o.name == "ping_role"
  )?.value ?? null;
  const winner_role = data.data.options?.find(
    o => o.name == "winner_role"
  )?.value ?? null;
  const winner_time = data.data.options?.find(
    o => o.name == "winner_time"
  )?.value ?? null;

  let updated = false;

  if(send_channel){
    const c = await bot.channels.get(send_channel);
    if(c.type != 0){
      embed.description = resEm(0) + "Wrong channel type provided!";
      await bot.slash.post(data.id, data.token, message);
      return;
    }
    updated = true;
  }

  const roles = { };
  if(playing_role || winner_role){
    const list = { };
    const ro = await bot.roles.list(data.guild_id);
    ro.forEach(r => list[r.id] = r.position);
    roles.p = list[playing_role];
    roles.w = list[winner_role];

    const user = await bot.user();
    const self = await bot.members.get(data.guild_id, user.id);
    roles.s = Math.max(...self.roles.map(r => list[r]));
  }

  if(playing_role){
    if(roles.p >= roles.s){
      embed.description = resEm(0) + "My role is not high enough " +
        "to assign <@&" + playing_role + "> to players!";
      await bot.slash.post(data.id, data.token, message);
      return;
    }
    if(playing_role == data.guild_id){
      embed.description = resEm(0) + "Everyone is not a role!";
      await bot.slash.post(data.id, data.token, message);
      return;
    }
    updated = true;
  }

  if(winner_role){
    if(roles.w >= roles.s){
      embed.description = resEm(0) + "My role is not high enough " +
        "to assign <@&" + winner_role + "> to winners!";
      await bot.slash.post(data.id, data.token, message);
      return;
    }
    if(winner_role == data.guild_id){
      embed.description = resEm(0) + "Everyone is not a role!";
      await bot.slash.post(data.id, data.token, message);
      return;
    }
    updated = true;
  }

  if(winner_time){
    const m = winner_time.match(/^(\d+):(\d\d)$/);
    if(!m){
      embed.description = resEm(0) + "Wrong time format used!";
      await bot.slash.post(data.id, data.token, message);
      return;
    }
    const time = parseInt(m[1]) * 60 + parseInt(m[2]);
    updated = true;
    await servers.put(data.guild_id, { "winner_time": time });
  }

  if(send_channel)
    await servers.put(data.guild_id, { send_channel });
  if(playing_role)
    await servers.put(data.guild_id, { playing_role });
  if(ping_role){
    updated = true;
    await servers.put(data.guild_id, { ping_role });
  }
  if(winner_role)
    await servers.put(data.guild_id, { winner_role });

  const entry = await servers.getEntry(data.guild_id);
  let c;
  const time = [];
  if(c = parseInt(entry.winner_time / 60))
    time.push(c + " hour" + (c == 1 ? "" : "s"));
  if(c = entry.winner_time % 60)
    time.push(c + " minute" + (c == 1 ? "" : "s"));

  embed.description = [
    resEm(1) + (
      updated ? "Updated server settings!" : "Server settings:"
    ),
    "Send channel: " + (
      (c = entry.send_channel) ? "<#" + c + ">" : "Unset"
    ),
    "Playing role: " + (
      (c = entry.playing_role) ? "<@&" + c + ">" : "Unset"
    ),
    "Ping role: " + (
      (c = entry.ping_role) ? "<@&" + c + ">" : "Unset"
    ),
    "Winner role: " + (
      (c = entry.winner_role) ? "<@&" + c + ">" : "Unset"
    ),
    "Winner time: " + time.join(" and ")
  ].join("\n");
  await bot.slash.post(data.id, data.token, message);
};
