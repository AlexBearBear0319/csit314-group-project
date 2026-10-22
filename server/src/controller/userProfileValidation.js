function profileFields(body) {
  const errors = {};
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = body?.description == null ? '' : body.description;
  if (!name) errors.name = 'Enter a profile name.';
  else if (name.length > 255) errors.name = 'Use 255 characters or fewer.';
  if (typeof description !== 'string') errors.description = 'Enter a description as text.';
  else if (description.trim().length > 255) errors.description = 'Use 255 characters or fewer.';
  if (Object.keys(errors).length) {
    const error = new Error(Object.values(errors)[0]);
    error.status = 400;
    error.errors = errors;
    throw error;
  }
  return { name, description: description.trim() };
}

function profileId(id) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) > 2147483647) {
    const error = new Error('Invalid user profile ID.');
    error.status = 400;
    throw error;
  }
  return Number(id);
}

module.exports = { profileFields, profileId };
