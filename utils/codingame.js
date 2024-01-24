const axios = require("axios");
const resEm = require("./response-emoji.js");

async function watchClash(
  bot, data, thisGuild, clash,
  sendChannel, public, handle,
  cocs, users, servers, handles
) {

  const embed = { "description": null, "color": 0x7CF2EE };
  const message = { "embeds": [embed], "allowed_mentions": { "parse": ["roles"] }};

  embed.description = "A clash is being hosted in <#" + sendChannel +
    ">, make sure to join in!";
  await bot.messages.post(data.channel.id, message);

  let server;
  if(public){
    const s = await bot.guilds.get(data.guild_id);
    server = s.name;
  }

  let guilds;
  if(public) guilds = await servers.entries();
  else guilds = [data.guild_id];
  const sent = { };
  const playing = new Set();

  const cache = { };

  if(thisGuild.winner_role){
    for(const w in thisGuild.winners){
      const t = thisGuild.winners[w];
      if(parseInt(Date.now() / 60000) - t > thisGuild.winner_time){
        await bot.memberRoles.del(
          data.guild_id, w, thisGuild.winner_role
        );
        delete thisGuild.winners[w];
      }
    }
    await servers[data.guild_id](e => { e.winners = thisGuild.winners; });
  }

  const modes = clash.modes.map(m => m.slice(0, 1).toUpperCase() +
    m.slice(1).toLowerCase()).join(", ");
  const langs = clash.programmingLanguages.length ?
    clash.programmingLanguages.join(", ") : "All";

  while(true){
    const clash = await getClash(handle);
    const mode = clash.mode ? (
      clash.mode.slice(0, 1).toUpperCase() +
      clash.mode.slice(1).toLowerCase()
    ) : modes;

    let all = true;
    const players = [];
    const role = new Set([...playing]);
    if(clash.finished)
      clash.players.sort((a, b) => a.rank - b.rank);
    for(const p of clash.players){
      const nick = p.codingamerNickname;
      const phandle = p.codingamerHandle;
      const user = await handles[phandle](e => e.user);
      const det = [p.rank];
      if(clash.finished){
        const t = parseInt(p.duration / 1000);
        const m = parseInt(t / 60);
        const s = ((t % 60) + "").padStart(2, 0);
        const d = [];
        if(langs == "Any" && p.languageId)
          d.push(p.languageId);
        d.push(p.score == null ? "waiting..." : p.score + "%");
        if(p.score == null) all = false;
        else {
          d.push(m + ":" + s);
          if(mode == "Shortest")
            d.push(p.criterion + " chars");
        }
        det.push(d.join("/"));
      }
      const pl = [nick, phandle, det];
      if(user){
        role.delete(user);
        playing.add(user);

        const mem = cache[user] ?? (
          cache[user] = await bot.members.get(data.guild_id, user)
        );
        if(
          mem.roles &&
          thisGuild.playing_role &&
          !mem.roles.includes(thisGuild.playing_role)
        ){
          await bot.memberRoles.put(
            data.guild_id, user, thisGuild.playing_role
          );
          cache[user].roles.push(thisGuild.playing_role);
        }
        pl.push(user);
      }
      players.push(pl);
    }
    if(thisGuild.playing_role){
      for(const user of ((clash.finished && all) ? playing : role)){
        await bot.memberRoles.del(
          data.guild_id, user, thisGuild.playing_role
        );
        cache[user].roles = cache[user].roles.filter(
          r => r != thisGuild.playing_role
        );
      }
    }
    const part = players.map(p =>
      (clash.finished ? p[2][0] + ". " : "") +
      "[" + p[0] + "](https://www.codingame.com/profile/" +
      p[1] + ")" + (p[3] ? " (<@" + p[3] + ">)" : "") +
      (clash.finished ? " " + p[2][1] : "")
    );

    let invite;
    if(!clash.started && !clash.finished){
      invite = "A Clash of Code is starting" +
        (public ? " on the server '" + server + "'" : "") +
        "!\n\nClick [join](https://www.codingame.com/" +
        "clashofcode/clash/" + handle + ") to participate, " +
        "the Clash will start <t:" +
        parseInt(clash.startTimestamp / 1000) + ":R>.\n\n" +
        "Modes: " + modes + "\n" +
        "Languages: " + langs + "\n\n" +
        "In the lobby: " + part.join(", ");
    } else if(clash.started && !clash.finished){
      invite = "A Clash of Code is running" +
        (public ? " on the server '" + server + "'" : "") +
        "!\n\nClick [join](https://www.codingame.com/" +
        "clashofcode/clash/" + handle + ") to participate, " +
        "the Clash started <t:" +
        parseInt(clash.startTimestamp / 1000) + ":R>.\n" +
        "The Clash will finish <t:" +
        parseInt((Date.now() + clash.msBeforeEnd) / 1000) + ":R>.\n\n" +
        "Mode: " + mode + "\n" +
        "Languages: " + langs + "\n\n" +
        "Currently playing: " + part.join(", ");
    } else if(!clash.started && clash.finished){
      invite = "The Clash" + (
        public ? " on the server '" + server + "'" : ""
      ) + " was aborted!";
      await cocs.remove(handle);
    } else {

      let winner;

      if(all){

        winner = players.find(
          p => p[3] && cache[p[3]]?.roles
        )?.[3];

        if(winner && thisGuild.winner_role){
          await bot.memberRoles.put(
            data.guild_id, winner, thisGuild.winner_role
          );
          await servers[data.guild_id](e => {
            e.winners[winner] = parseInt(Date.now() / 60000);
          });
          await users[winner](e => e.won_games ++);
        }
        for(const p of players){
          if(p[3])
            await users[p[3]](e => e.played_games ++);
        }
      }

      invite = "The Clash of Code" +
        (public ? " on the server '" + server + "'" : "") +
        " has finished! Good game everybody!\n\n" +
        "The Clash finished <t:" +
        parseInt((Date.now() + clash.msBeforeEnd) / 1000) + ":R>, " +
        "click [here](https://www.codingame.com/" +
        "clashofcode/clash/report/" + handle + ") to see the " +
        "results.\n\n" +
        "Mode: " + mode + "\n" +
        "Languages: " + langs + "\n\n" +
        (winner ? "Game winner: <@" + winner + ">, congrats!\n\n" : "") +
        resEm(1) + "Leaderboard:\n" + part.join("\n");

    }

    for(const gid of guilds){

      const guild = await servers[gid](e => e);
      if(!guild.send_channel) continue;

      const ping = guild.ping_role ? "<@&" + guild.ping_role + ">" : null;
      message.content = ping;

      embed.description = invite;

      if(gid in sent){
        const m = await bot.messages.patch(guild.send_channel, sent[gid], message);
        if(m.code) delete sent[gid];
      } else {
        const m = await bot.messages.post(guild.send_channel, message);
        if(m.id) sent[gid] = m.id;
      }
    }

    if(clash.finished && all) break;
    await new Promise(r => setTimeout(r, 5000));
  }
}

async function createClash(ownerId, rememberMe, langs, modes) {
  const res = await axios.post(
    "https://www.codingame.com/services/" +
    "ClashOfCode/createPrivateClash",
    [ownerId, langs, modes],
    {
      "headers": { "Cookie": "rememberMe=" + rememberMe }
    }
  );
  return res.data;
}

async function getUser(handle) {
  const res = await axios.post(
    "https://www.codingame.com/services/" +
    "CodinGamer/findCodingamePointsStatsByHandle",
    [handle]
  );
  return res.data;
}

async function getClash(handle) {
  const res = await axios.post(
    "https://www.codingame.com/services/" +
    "ClashOfCode/findClashByHandle",
    [handle]
  );
  return res.data;
}

module.exports = { watchClash, createClash, getUser, getClash };
