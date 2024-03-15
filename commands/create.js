const resEm = require("../utils/response-emoji.js");
const codingame = require("../utils/codingame.js");

module.exports = async (bot, data, servers, cocs, users, handles) => {

  const embed = { "description": null, "color": 0x7CF2EE };
  const message = { "embeds": [embed], "flags": 64 };

  const userId = data.user?.id ?? data.member.user.id;
  const user = await users[userId](e => e);

  if(!user.handle){
    embed.description = resEm(0) + "You have to connect your " +
      "Codingame account to perform this action! " +
      "To do so, please run the `/register` command.";
    await bot.slash.post(data.id, data.token, message);
    return;
  }
  if(!user.cookie){
    embed.description = resEm(0) + "You have to provide your " +
      "login cookie to perform this action! " +
      "To do so, please run the `/cookie` command.";
    await bot.slash.post(data.id, data.token, message);
    return;
  }

  if (!data.guild_id) {
    embed.description = resEm(0) + "Create command can only be used on servers!";
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

  const lang1 = [
    "C", "C++", "D", "Go", "Rust", "Swift",
    "TypeScript", "Kotlin", "Java", "Groovy", "Scala"
  ];
  const lang2 = [
    "Bash", "Clojure", "Dart", "F#", "Haskell",
    "Javascript", "Lua", "ObjectiveC", "OCaml",
    "Pascal", "Perl", "PHP", "Python3", "Ruby", "VB.NET"
  ];
  const types = ["SHORTEST", "FASTEST", "REVERSE"];

  embed.description = "Please choose!";
  message.components = [
    {
      "type": 1,
      "components": [
        {
          "type": 3,
          "custom_id": "langs_first",
          "min_values": 0,
          "max_values": lang1.length,
          "placeholder": "Typed languages",
          "options": lang1.map(l => ({ "label": l, "value": l }))
        }
      ]
    },
    {
      "type": 1,
      "components": [
        {
          "type": 3,
          "custom_id": "langs_second",
          "min_values": 0,
          "max_values": lang1.length,
          "placeholder": "Dynamic languages",
          "options": lang2.map(l => ({ "label": l, "value": l }))
        }
      ]
    },
    {
      "type": 1,
      "components": [
        {
          "type": 3,
          "custom_id": "types",
          "min_values": 1,
          "max_values": 3,
          "placeholder": "Clash modes",
          "options": types.map(l => ({ "label": l[0] + l.slice(1).toLowerCase(), "value": l }))
        }
      ]
    },
    {
      "type": 1,
      "components": [
        {
          "type": 3,
          "custom_id": "public",
          "placeholder": "Public clash",
          "options": [
             { "label": "False", "value": "False" },
             { "label": "True", "value": "True" }
           ]
        }
      ]
    },
    {
      "type": 1,
      "components": [
        {
          "type": 2,
          "custom_id": "create",
          "style": 1,
          "label": "Create a clash"
        }
      ]
    }
  ];
  await bot.slash.post(data.id, data.token, message);

  let sel1 = [];
  let sel2 = [];
  let type = types;
  let public = "False";
  while(true) {
    const res = await bot.waitForEvent(
      "INTERACTION_CREATE",
      d => d.type == 3 && d.message.interaction?.id == data.id,
      300000
    );
    if (res == null) {
      embed.description = resEm(0) + "Selection timed out, please try again!";
      message.components = [];
      await bot.interactions.patch(data.token, message);
      return;
    }
    if (res.data.custom_id == "create") {
      const langs = [...sel1, ...sel2]
      embed.description = resEm(1) + "Creating clash...\n" +
        "Mode: " + type.map(l => l[0] + l.slice(1).toLowerCase()).join(", ") + "\n" +
        "Languages: " + (langs.length ? langs.join(", ") : "All") + "\n" +
        "Public: " + public;
      message.components = [];
      await bot.components.post(res.id, res.token, message);
      break;

    } else if (res.data.custom_id == "langs_first") {
      sel1 = res.data.values;
    } else if (res.data.custom_id == "langs_second") {
      sel2 = res.data.values;
    } else if (res.data.custom_id == "types") {
      type = res.data.values;
    } else if (res.data.custom_id == "public") {
      public = res.data.values[0];
    }
    await bot.components.defer(res.id, res.token);
  }

  const u = await codingame.getUser(user.handle);
  if (!u) {
    embed.description = resEm(0) + "Your Codingame account seems to have " +
      "moved or deleted, please reconnect using `/register`!";
    await bot.slash.patch(data.token, message);
    return;
  }
  const cc = await codingame.createClash(
    u.codingamer.userId, user.cookie, [...sel1, ...sel2], type
  );
  if (cc.id == 501) {
    embed.description = resEm(0) + "Bot login data expired, " +
      "please contact the creator with a request to refresh the cookies!";
    await bot.interaction.patch(data.token, message);
    loggen.lock = false;
    return;
  }
  const clash = await codingame.getClash(cc.publicHandle);
  await cocs.add(cc.publicHandle);

  await codingame.watchClash(
    bot, data, thisGuild, clash,
    sendChannel, public == "True", cc.publicHandle,
    cocs, users, servers, handles
  );
};
