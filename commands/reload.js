const resEm = require("../utils/response-emoji.js");
const { spawn } = require("child_process");
const { utils } = require("nullcord");

module.exports = async (bot, data) => {

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
  let code = await new Promise(res => {
    const proc = spawn("git", ["pull"]);

    proc.stdout.on("data", chunk => { stdout += chunk; });
    proc.stderr.on("data", chunk => { stderr += chunk; });

    proc.on("close", res);
  });

  if (code) {
    const out = ["\n`git` exit code: " + code + "\n"];
    if(stdout.length){
      out.push("stdout:\n```ansi\n" + stdout + "```");
    }
    if(stderr.length){
      out.push("stderr:\n```ansi\n" + stderr + "```");
    }

    embed.description = resEm(0) + "An error occured!" + out.join("");
    await bot.interactions.patch(data.token, message);
    return;
  }

  code = await new Promise(res => {
    const proc = spawn("npm", ["install"]);

    proc.stdout.on("data", chunk => { stdout += chunk; });
    proc.stderr.on("data", chunk => { stderr += chunk; });

    proc.on("close", res);
  });

  const out = ["\n`npm` exit code: " + code + "\n"];
  if(stdout.length){
    out.push("stdout:\n```ansi\n" + stdout + "```");
  }
  if(stderr.length){
    out.push("stderr:\n```ansi\n" + stderr + "```");
  }

  if (code == 0) {
    let m = 0;
    for (const module in require.cache) {
      delete require.cache[module];
      m ++;
    }
    await utils.updateCommands(bot, "./commands/list.json");

    embed.description = resEm(1) + "Successfully reloaded!\n" +
      "Purged cache: " + m + " modules" + out.join("");
  } else {
    embed.description = resEm(0) + "An error occured!" + out.join("");
  }
  await bot.interactions.patch(data.token, message);

};
