const resEm = require("../utils/response-emoji.js");

module.exports = async (bot, data, users) => {

  const embed = { "description": null, "color": 0x7CF2EE };
  const message = { "embeds": [embed], "flags": 64 };

  const time = data.data.options.find(o => o.name == "time").value;

  const m = time.match(/^(\d+):(\d\d)$/);
  if(!m){
    embed.description = resEm(0) + "Wrong time format used!";
    await bot.slash.post(data.id, data.token, message);
    return;
  }
  const ho = parseInt(m[1]);
  const mi = parseInt(m[2]);
  const h = ho * 60 + mi;
  if(h > 5 * 60){
    embed.description = resEm(0) + "A party can't be longer " +
      "than 5 hours!";
    await bot.slash.post(data.id, data.token, message);
    return;
  }
  if(h < 30){
    embed.description = resEm(0) + "A party can't be shorter " +
      "than half an hour!";
    await bot.slash.post(data.id, data.token, message);
    return;
  }

  const post = data.data.options.find(
    o => o.name == "post")?.value ?? false;
  if(post) delete message.flags;

  embed.description = "Fetching all the users... This may " +
    "take a while in large guilds.";
  await bot.slash.post(data.id, data.token, message);

  const ids = [];
  let max;
  while(true){
    const ms = await bot.members.list(data.guild_id, max, 1000);
    if(!ms.length) break;
    const is = ms.map(m => m.user.id).sort();
    max = is.slice(-1)[0];
    ids.push(...is);
  }
  const ava = { };
  for(const id of ids){
    const available = await users[id](e => e.available);
    if(available) ava[id] = available;
  }
  const times = [...Array(24 * 60)].map(i => []);
  for(const id in ava){
    const [start, end] = ava[id];
    let i = start;
    while(i != end){
      times[i].push(id);
      i = (i + 1) % (24 * 60);
    }
  }
  const now = parseInt(Date.now() / 1000 + 60);
  const current = parseInt(now / 60) % (24 * 60);
  const scores = [];
  for(let i = 0; i < 24 * 60; i ++){
    // the further away the time is, the smaller weight it gets
    const weight = 24 * 60 - i;
    const people = new Set();
    let score = 0;
    for(let j = 0; j < h; j ++){
      const there = times[(current + i + j) % (24 * 60)];
      for(const id of there)
        people.add(id);
      score += there.length;
    }
    if(people.size > 1)
      scores.push({ "w": weight + score ** 2, "p": people, i });
  }
  scores.sort((a, b) => b.w - a.w);
  const close = (a, b) => Math.abs(a.i - b.i) < h;
  const top3 = scores.filter((s, i) => {
    if(scores.filter(c => close(s, c)).length == 1) return true;
    return Math.max(
      ...(scores.filter(
        c => close(s, c)
      ).map(c => c.w))
    ) == s.w;
  }).slice(0, 3);

  if(!top3.length){
    embed.description = resEm(0) + "No times could be found!";
    await bot.interactions.patch(data.token, message);
    return;
  }

  const t = (ho ? ho + "h " : "") + (mi ? mi + "min" : "");
  const txt = [resEm(1) + "Best times to plan a party for " + t.trim() + " are:"];
  top3.forEach((s, i) => {
    const pep = [...s.p];
    const pip = pep.map(p => "<@" + p + ">").slice(0, 50);
    if(pep.length > 50) pip.push("...");
    txt.push(
      (i + 1) + ". <t:" + (now + s.i * 60) + ":R> with " +
      pep.length + " player" + (pep.length == 1 ? "" : "s") +
      ": " + pip.join(", ")
    );
  });
  embed.description = txt.join("\n");
  await bot.interactions.patch(data.token, message);

};
