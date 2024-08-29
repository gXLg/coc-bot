(async () => {
  const fs = require("fs");

  const database = "./database/";
  if (fs.existsSync(database)) {
    if (!fs.lstatSync(database).isDirectory()) {
      console.log("The database path is not a directory!");
      return;
    }
  } else fs.mkdirSync(database);

  const { Bot, utils, consts } = require("nullcord");
  const token = fs.readFileSync(".token", "utf-8").trim();
  const { BadTable, BadSet } = require("badb");
  const { sigint } = require("gxlg-utils");
  const parameters = require("./utils/parameters.js");

  const bot = new Bot(token, { "internal": true });
  await utils.updateCommands(bot, "./commands/list.json");
  const botUser = await bot.self.getUser();

  const servers = new BadTable(
    database + "servers.badb",
    {
      "key": "guild_id",
      "values": [
        { "name": "guild_id", "maxLength": 20 },
        { "name": "send_channel", "maxLength": 20 },
        { "name": "playing_role", "maxLength": 20 },
        { "name": "ping_role", "maxLength": 20 },
        { "name": "winner_role", "maxLength": 20 },
        { "name": "winner_time", "type": "uint16", "default": 180 }
        // -> own db for winners
      ]
    }
  );
  const winners = new BadTable(
    database + "winners.badb",
    {
      "key": "guild_id",
      "values": [
        { "name": "guild_id", "maxLength": 25 }, // + '@' + index
        { "name": "user_id", "maxLength": 20 },
        { "name": "timestamp", "maxLength": 7 } // base36
      ]
    }
  );
  const cocs = new BadSet(
    database + "cocs.badb",
    { "maxLength": 50 }
  );
  const users = new BadTable(
    database + "users.badb",
    {
      "key": "user_id",
      "values": [
        { "name": "user_id", "maxLength": 20 },
        { "name": "handle", "maxLength": 50 },
        { "name": "played_games", "type": "uint16" },
        { "name": "won_games", "type": "uint16" },
        { "name": "available_from", "type": "int16", "default": -1 },
        { "name": "available_to", "type": "int16", "default": -1 },
        { "name": "cookie", "maxLength": 50 }
      ]
    }
  );
  const handles = new BadTable(
    database + "handles.badb",
    {
      "key": "handle",
      "values": [
        { "name": "handle", "maxLength": 50 },
        { "name": "user_id", "maxLength": 20 }
      ]
    }
  );
  const loggen = { "lock": false };


  let statusSwitch = true;
  async function setStatus(gg) {
    if (statusSwitch) {
      const g = gg ?? bot.guildsCount();
      bot.setStatus({
        "status": "online",
        "since": 0,
        "afk": false,
        "activities": [{
          "name": g + " guild" + (g == 1 ? "" : "s"),
          "type": consts.activity_types.Competing
        }]
      });
    } else {
      const c = cocs.size();
      bot.setStatus({
        "status": "online",
        "since": 0,
        "afk": false,
        "activities": [{
          "name": c + " clash" + (c == 1 ? "" : "es"),
          "type": consts.activity_types.Watching
        }]
      });
    }
    statusSwitch = !statusSwitch;
  }

  let rg = 0;
  let status;
  bot.events["READY"] = async data => {
    bot.logger.sinfo(data.shard[0], "Got ready!");
    rg += data.guilds.length;

    if (bot.ready()) {
      bot.logger.info("Bot logged in as", botUser.username);
      setStatus(rg);
      status = setInterval(() => {
        setStatus();
      }, 30 * 1000);
      delete bot.events["READY"];
    }
  };

  bot.events["INTERACTION_CREATE"] = async data => {
    if(data.type != 2) return;
    const name = data.data.name;
    try {
      bot.logger.info("Executing application command", name);
      const run = require("./commands/" + name + ".js");
      const args = parameters(run).map(p => eval(p));
      await run(...args);
    } catch (error) {
      bot.logger.error("Execution of", name, "failed");
      bot.logger.error(error);
      const message = {
        "embeds": [{
          "description": "Internal error occured:\n" + error,
          "color": 0xF23BA1
        }],
        "flags": 64
      };
      const msg = await bot.slash.post(data.id, data.token, message);
      if (msg.code) await bot.interactions.patch(data.token, message);
    }
  };

  sigint(async () => {
    bot.logger.info("Ctrl-C received, waiting for everything to stop...");
    clearInterval(status);
    [servers, winners, cocs, users, handles].forEach(db => db.close());
    await bot.destroy();
    process.exit(0);
  });

  await bot.login(consts.gateway_intents.mask(
    "GUILDS",
    "GUILD_MEMBERS"
  ));

})();
