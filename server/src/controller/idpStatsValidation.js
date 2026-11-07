// Small helper for stories #30 and #31.
// The project id comes from the web address, so it is text. Check it before
// it goes near the database.

function parseProjectId(id) {
  // Must be a whole number that starts with 1-9 (so "0", "-1", "1.5" and "abc" fail).
  // 2147483647 is the biggest number a database integer column can hold.
  if (!/^[1-9][0-9]*$/.test(String(id)) || Number(id) > 2147483647) {
    // status 400 = Bad Request. The route turns this into a 400 reply.
    throw Object.assign(new Error('Invalid project ID.'), { status: 400 });
  }
  return Number(id);
}

module.exports = { parseProjectId };
