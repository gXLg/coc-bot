const resEm = require("../utils/response-emoji.js");
const { spawn } = require("child_process");
const { utils } = require("nullcord");

module.exports = async (bot, data, servers, cocs, users, handles, loggen) => {

  const embed = { "description": null, "color": 0x7CF2EE };
  const message = { "embeds": [embed], "flags": 64 };

  const userId = data.user?.id ?? data.member.user.id;
  const owner = "557260090621558805";
  if(userId != owner){
    embed.description = resEm(0) + "Only <@" + owner + "> can run this!";
    await bot.slash.post(data.id, data.token, message);
    return;
  }

  embed.description = "Reloading...";
  await bot.slash.post(data.id, data.token, message);

  let stdout = "";
  let stderr = "";
  const code = await new Promise(res => {
    const proc = spawn("git", ["pull"]);

    proc.stdout.on("data", chunk => { stdout += chunk; });
    proc.stderr.on("data", chunk => { stderr += chunk; });

    proc.on("close", res);
  });

  const out = ["\n**Details**", "Exit code: " + code];
  if(stdout.length){
    out.push("stdout:\n```ansi" + stdout + "```");
  }
  if(stderr.length){
    out.push("stderr:\n```ansi" + stderr + "```");
  }

  await utils.updateCommands(bot, "./commands/list.json");

  embed.description = resEm(code == 0) + (
    code == 0 ? "(test) Successfully reloaded!" : "An error occured!"
  ) + out.join("\n");
  await bot.interactions.patch(data.token, message);

};
