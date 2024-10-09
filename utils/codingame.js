const axios = require("axios");
const resEm = require("./response-emoji.js");
const { paginate } = require("nullcord").utils;

const api_error = new Error("Could not perform the API request");
const MAX_RETRY = 5;

async function watchClash(
  bot, data, thisGuild, clash,
  sendChannel, public, handle,
  cocs, users, servers, winners, handles
) {

  const embed = { "description": null, "color": 0x7CF2EE };
  const message = { "embeds": [embed], "allowed_mentions": { "parse": ["roles"] }};

  embed.description = "A clash is being hosted in <#" + sendChannel +
    ">, make sure to join in!";
  await bot.messages.post(data.channel.id, message);

  let server;
  if (public) {
    const s = await bot.guilds.get(data.guild_id);
    server = s.name;
  }

  const guilds = [];
  if (public) {
    const gs = await paginate(bot.self.listGuilds, g => g.id, 200);
    guilds.push(...gs.map(g => g.id));
  } else guilds.push(data.guild_id);
  const sent = { };
  const playing = new Set();

  const cache = { };

  if (thisGuild.winner_role) {
    const toRemove = new Set();
    const toKeep = [];

    // get all winners for this guild
    const now = parseInt(Date.now() / 60000);
    let index = 0;
    while (true) {
      const a = "@" + index.toString(16).padStart(4, "0");
      const cont = await winners[data.guild_id + a]((e, c) => {
        if (!c.exists()) return false;

        const time = parseInt(e.timestamp, 36);
        if (now - time > thisGuild.winner_time) {
          toRemove.add(e.user_id);
        } else {
          toKeep.push(index);
        }
        return true;
      });
      if (!cont) break;
      index ++;
    }

    // delete role from old winners
    for (const user of toRemove) {
      await bot.memberRoles.del(
        data.guild_id, user, thisGuild.winner_role
      );
    }

    // shift array entries to remove deleted ones
    for (let i = 0; i < index; i ++) {
      const a1 = "@" + i.toString(16).padStart(4, "0");
      if (toKeep.length == 0) {
        await winners[data.guild_id + a1]((e, c) => c.remove());
        continue;
      }
      const keep = toKeep.shift();
      const a2 = "@" + keep.toString(16).padStart(4, "0");
      if (a1 == a2) continue;
      await winners[data.guild_id + a1](async e1 => {
        await winners[data.guild_id + a2](e2 => {
          e1.user_id = e2.user_id;
          e1.timestamp = e2.timestamp;
        });
      });
    }
  }

  const modes = clash.modes.map(m => m.slice(0, 1).toUpperCase() +
    m.slice(1).toLowerCase()).join(", ");
  const langs = clash.programmingLanguages.length ?
    clash.programmingLanguages.join(", ") : "All";

  while (true) {
    const clash = await getClash(handle);
    const mode = clash.mode ? (
      clash.mode.slice(0, 1).toUpperCase() +
      clash.mode.slice(1).toLowerCase()
    ) : modes;

    let all = true;
    const players = [];
    const role = new Set([...playing]);
    if (clash.finished)
      clash.players.sort((a, b) =>
        (a.rank != b.rank) ? (a.rank - b.rank) : (a.duration - b.duration)
      );
    for (const p of clash.players) {
      const nick = p.codingamerNickname;
      const phandle = p.codingamerHandle;
      const user = await handles[phandle](e => e.user_id);
      const det = [p.rank];
      if (clash.finished) {
        const t = parseInt(p.duration / 1000);
        const m = parseInt(t / 60);
        const s = ((t % 60) + "").padStart(2, 0);
        const d = [];
        if (clash.programmingLanguages.length > 0 && p.languageId)
          d.push(p.languageId);
        d.push(p.score == null ? "waiting..." : p.score + "%");
        if (p.score == null) all = false;
        else {
          d.push(m + ":" + s);
          if (mode == "Shortest")
            d.push(p.criterion + " chars");
        }
        det.push(d.join("/"));
      }
      const pl = [nick, phandle, det];
      if (user) {
        role.delete(user);
        playing.add(user);

        const mem = cache[user] ?? (
          cache[user] = await bot.members.get(data.guild_id, user)
        );
        if (
          mem.roles && thisGuild.playing_role &&
          !mem.roles.includes(thisGuild.playing_role)
        ) {
          await bot.memberRoles.put(
            data.guild_id, user, thisGuild.playing_role
          );
          cache[user].roles.push(thisGuild.playing_role);
        }
        pl.push(user);
      }
      players.push(pl);
    }
    if (thisGuild.playing_role) {
      for (const user of ((clash.finished && all) ? playing : role)) {
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
    if (!clash.started && !clash.finished) {
      invite = "A Clash of Code is starting" +
        (public ? " on the server '" + server + "'" : "") +
        "!\n\nClick [join](https://www.codingame.com/" +
        "clashofcode/clash/" + handle + ") to participate, " +
        "the Clash will start <t:" +
        parseInt(clash.startTimestamp / 1000) + ":R>.\n\n" +
        "Modes: " + modes + "\n" +
        "Languages: " + langs + "\n\n" +
        "In the lobby: " + part.join(", ");
    } else if (clash.started && !clash.finished) {
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
    } else if (!clash.started && clash.finished) {
      invite = "The Clash" + (
        public ? " on the server '" + server + "'" : ""
      ) + " was aborted!";
      await cocs.remove(handle);
    } else {

      let winner;

      if (all) {

        winner = players.find(
          p => p[3] && cache[p[3]]?.roles
        )?.[3];

        if (winner) await users[winner](e => e.won_games ++);
        if (winner && thisGuild.winner_role) {
          await bot.memberRoles.put(
            data.guild_id, winner, thisGuild.winner_role
          );
          let index = 0;
          while (true) {
            const a = "@" + index.toString(16).padStart(4, "0");
            const cont = await winners[data.guild_id + a]((e, c) => {
              if (!c.exists() || e.user_id == winner) {
                e.user_id = winner;
                e.timestamp = parseInt(Date.now() / 60000).toString(36);
                return false;
              }
              return true;
            });
            if (!cont) break;
            index ++;
          }
        }
        for (const p of players) {
          if (p[3]) await users[p[3]](e => e.played_games ++);
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

    for (const gid of guilds) {
      const guild = await servers[gid](e => e);
      if (!guild.send_channel) continue;

      const ping = guild.ping_role ? "<@&" + guild.ping_role + ">" : null;
      message.content = ping;

      embed.description = invite;

      if (gid in sent) {
        const m = await bot.messages.patch(guild.send_channel, sent[gid], message);
        if (m.code) delete sent[gid];
      } else {
        const m = await bot.messages.post(guild.send_channel, message);
        if (m.id) sent[gid] = m.id;
      }
    }

    if (clash.finished && all) break;
    await new Promise(r => setTimeout(r, 5000));
  }
}

async function createClash(ownerId, rememberMe, langs, modes) {
  let res;
  let retry = MAX_RETRY;
  while (retry--) {
    try {
      res = await axios.post(
        "https://www.codingame.com/services/" +
        "ClashOfCode/createPrivateClash",
        [ownerId, langs, modes],
        {
          "headers": { "Cookie": "rememberMe=" + rememberMe }
        }
      );
      break;
    } catch (error) {
      if (error.response) {
        res = error.response;
        break;
      }
    }
  }
  if (res == null) throw api_error;
  return res.data;
}

async function getUser(handle) {
  let res;
  let retry = MAX_RETRY;
  while (retry--) {
    try {
      res = await axios.post(
        "https://www.codingame.com/services/" +
        "CodinGamer/findCodingamePointsStatsByHandle",
        [handle]
      );
      break;
    } catch (error) {
      if (error.response) {
        res = error.response;
        break;
      }
    }
  }
  if (res == null) throw api_error;
  return res.data;
}

async function leaveClash(handle, ownerId, rememberMe) {
  let res;
  let retry = MAX_RETRY;
  while (retry--) {
    try {
      res = await axios.post(
        "https://www.codingame.com/services/" +
        "ClashOfCode/leaveClashByHandle",
        [ownerId, handle],
        {
          "headers": { "Cookie": "rememberMe=" + rememberMe }
        }
      );
      break;
    } catch (error) {
      if (error.response) {
        res = error.response;
        break;
      }
    }
  }
  if (res == null) throw api_error;
  return res.data;
}

async function getClash(handle) {
  let res;
  let retry = MAX_RETRY;
  while (retry--) {
    try {
      res = await axios.post(
        "https://www.codingame.com/services/" +
        "ClashOfCode/findClashByHandle",
        [handle]
      );
      break;
    } catch (error) {
      if (error.response) {
        res = error.response;
        break;
      }
    }
  }
  if (res == null) throw api_error;
  return res.data;
}

module.exports = { watchClash, createClash, getUser, getClash, leaveClash };
