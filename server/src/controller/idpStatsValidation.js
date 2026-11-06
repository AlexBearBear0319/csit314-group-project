// Accept only a positive whole-number project ID that fits a database integer.
function parseProjectId(id) {
  if (!/^[1-9][0-9]*$/.test(String(id)) || Number(id) > 2147483647) {
    throw Object.assign(new Error('Invalid project ID.'), { status: 400 });
  }
  return Number(id);
}
module.exports = { parseProjectId };
