function companyFields(body) {
  const errors = {};
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = body?.description === undefined ? '' : body.description;
  if (!name || name.length > 255) errors.name = 'Enter a company name of up to 255 characters.';
  if (typeof description !== 'string' || description.trim().length > 5000) errors.description = 'Enter a description of up to 5,000 characters.';
  if (Object.keys(errors).length) throw Object.assign(new Error('Check the company details.'), { status: 400, errors });
  return { name, description: description.trim() };
}
function keyword(value = '') {
  if (typeof value !== 'string' || value.length > 255) throw Object.assign(new Error('Enter a search term of up to 255 characters.'), { status: 400 });
  return value;
}
module.exports = { companyFields, keyword };
