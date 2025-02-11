const resEm = require("../utils/response-emoji.js");
const { spawn } = require("child_process");

module.exports = async (bot, data) => {

  const embed = { "description": null, "color": 0x7CF2EE };
  const message = { "embeds": [embed], "flags": 64 };

  const userId = data.user?.id ?? data.member.user.id;
  const owner = "557260090621558805";
  if (userId != owner) {
    embed.description = resEm(0) + "Only <@" + owner + "> can run this!";
    await bot.slash.post(data.id, data.token, message);
    return;
  }

  const exe = data.data.options.find(o => o.name == "code").value;

  embed.description = "Running...";
  await bot.slash.post(data.id, data.token, message);

  let stdout = "";
  let stderr = "";
  const code = await new Promise(res => {
    const proc = spawn("bash", ["-c", exe]);

    proc.stdout.on("data", chunk => { stdout += chunk; });
    proc.stderr.on("data", chunk => { stderr += chunk; });

    proc.on("close", res);
  });

  const out = [" Exit code: " + code + "\n"];
  if (stdout.length) {
    out.push("stdout:\n```ansi\n" + stdout + "```");
  }
  if (stderr.length) {
    out.push("stderr:\n```ansi\n" + stderr + "```");
  }

  embed.description = resEm(!code) + out.join("");
  await bot.interactions.patch(data.token, message);
}
