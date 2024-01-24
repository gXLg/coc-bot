const args = /([^\s,]+)/g;
module.exports = function(func) {
  const str = func.toString();
  const result = str.slice(
    str.indexOf("(") + 1,
    str.indexOf(")")
  ).match(args);
  if(result == null) return [];
  return result;
}
