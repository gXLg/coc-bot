const resEm = require("../utils/response-emoji.js");
const tzSet = Intl.supportedValuesOf("timeZone");

function getTZOff(timeZone){
  const now = new Date();
  const tzString = now.toLocaleString("en-US", { timeZone });
  const localString = now.toLocaleString("en-US");
  const diff = (Date.parse(localString) - Date.parse(tzString)) / 60000;
  const offset = diff + now.getTimezoneOffset();
  return - offset;
}

module.exports = async (bot, data, users) => {

  const embed = { "description": null, "color": 0x7CF2EE };
  const message = { "embeds": [embed], "flags": 64 };

  const userId = data.user?.id ?? data.member.user.id;

  const time = data.data.options.find(
    o => o.name == "time").value;
  const tz = data.data.options.find(
    o => o.name == "timezone").value;

  const t = time.match(/^(2[0-3]|1\d|0?\d):(\d\d)-(2[0-3]|1\d|0?\d):(\d\d)$/);
  if(!t){
    embed.description = resEm(0) + "Wrong time format!";
    await bot.slash.post(data.id, data.token, message);
    return;
  }
  if(!tzSet.includes(tz)){
    embed.description = resEm(0) + "Wrong timezone format or " +
      "this timezone is not supported by the server! " +
      "Use one of timezones from official " +
      "[tz database](https://en.m.wikipedia.org/" +
      "wiki/List_of_tz_database_time_zones#List), " +
      "e.g. Europe/Berlin.";
    await bot.slash.post(data.id, data.token, message);
    return;
  }
  const s = parseInt(t[1]) * 60 + parseInt(t[2]);
  const e = parseInt(t[3]) * 60 + parseInt(t[4]);

  const off = getTZOff(tz);
  const start = (s + 24 * 60 - off) % (24 * 60);
  const end = (e + 24 * 60 - off) % (24 * 60);

  await users[userId](e => {
    e.available = [start, end];
    e.timezone = tz;
  });

  embed.description = resEm(1) + "Successfully set " +
    "your availability times!";
  await bot.slash.post(data.id, data.token, message);

};
