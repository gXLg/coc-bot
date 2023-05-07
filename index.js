(async () => {

  function require_(mod){
    delete require.cache[require.resolve(mod)];
    return require(mod);
  }

  const DEBUG = true;

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

  const bot = new Bot(token, DEBUG);
  await utils.updateCommands(bot, "./commands/list.json", DEBUG);
  const botUser = await bot.user();

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
      "timezone"
    ]
  );
  const handles = new AsyncTable(
    database + "handles.json",
    ["user"]
  );

  let statusSwitch = true;
  async function setStatus(gg){
    if(statusSwitch){
      const g = gg ?? bot.shards.reduce((a, b) => a + b.guilds, 0);
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
    console.log("[Shard #" + a + "] got ready!");
    rg += data.guilds.length;

    if(bot.ready()){
      console.log("Bot logged in as", botUser.username);
      setStatus(rg);
      delete bot.events["READY"];
    }
  };

  const status = setInterval(() => {
    setStatus();
  }, 30 * 1000);

  bot.events["INTERACTION_CREATE"] = async data => {
    if(data.type != 2) return;
    try {
      const name = data.data.name;
      const run = require_("./commands/" + name + ".js");
      await run(bot, data, servers, cocs, users, handles);
    } catch(error){
      const message = {
        "embeds": [{ "description": "Internal error occured:\n" + error }],
        "flags": 64
      };
      const msg = await bot.slash.post(data.id, data.token, message);
      if(msg.code) await bot.interactions.patch(data.token, message);
    }
  };

  let ctrlC = false;
  process.on("SIGINT", async () => {
    if(ctrlC) return;
    ctrlC = true;
    if(DEBUG)
      console.log("\rCtrl-C received, waiting for everything to stop...");
    clearInterval(status);
    await bot.destroy();
    await Promise.all([
      servers, cocs, users, handles
    ].map(db => db.stop()));
    process.exit(0);
  });

  await bot.login(consts.gateway_intents.mask(
    "GUILDS",
    "GUILD_MEMBERS"
  ));

})();
