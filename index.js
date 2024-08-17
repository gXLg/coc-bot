(async () => {
  const fs = require("fs");

  const database = "./database/";
  if(fs.existsSync(database)){
    if(!fs.lstatSync(database).isDirectory()){
      console.log("The database path is not a directory!");
      return;
    }
  } else fs.mkdirSync(database);

  const { Bot, utils, consts } = require("nullcord");
  const token = fs.readFileSync(".token", "utf-8").trim();
  const { AsyncTable, AsyncSet } = require("gxlg-asyncdb");
  const { sigint } = require("gxlg-utils");
  const parameters = require("./utils/parameters.js");

  const bot = new Bot(token, { "internal": true });
  await utils.updateCommands(bot, "./commands/list.json");
  const botUser = await bot.self.getUser();

  const servers = new AsyncTable(
    database + "servers.json",
    [
      "send_channel",
      "playing_role",
      "ping_role",
      "winner_role",
      ["winner_time", 180],
      ["winners", { }]
    ]
  );
  const cocs = new AsyncSet("./database/cocs.json");
  const users = new AsyncTable(
    database + "users.json", [
      "handle",
      ["played_games", 0],
      ["won_games", 0],
      "available",
      "timezone",
      "cookie"
    ]
  );
  const handles = new AsyncTable(
    database + "handles.json",
    ["user"]
  );
  const loggen = { "lock": false };

  let statusSwitch = true;
  async function setStatus(gg){
    if(statusSwitch){
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
      const c = await cocs.size();
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
  bot.events["READY"] = async data => {
    bot.logger.sinfo(data.shard[0], "Got ready!");
    rg += data.guilds.length;

    if(bot.ready()){
      bot.logger.info("Bot logged in as", botUser.username);
      setStatus(rg);
      delete bot.events["READY"];
    }
  };

  const status = setInterval(() => {
    setStatus();
  }, 30 * 1000);

  bot.events["INTERACTION_CREATE"] = async data => {
    if(data.type != 2) return;
    const name = data.data.name;
    try {
      bot.logger.info("Executing application command", name);
      const run = require("./commands/" + name + ".js");
      const args = parameters(run).map(p => eval(p));
      await run(...args);
    } catch(error){
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
      if(msg.code) await bot.interactions.patch(data.token, message);
    }
  };

  sigint(async () => {
    bot.logger.info("Ctrl-C received, waiting for everything to stop...");
    clearInterval(status);
    await bot.destroy();
    process.exit(0);
  });

  await bot.login(consts.gateway_intents.mask(
    "GUILDS",
    "GUILD_MEMBERS"
  ));

})();
