// =============================================================================
// CONTROLLER HELPER: designerIdpValidation
// Input rules for the designer's project stories (#20-29).
//
// The designer's page (ManageCurrentIdpsPg / ManagePastIdpsPg) checks the same
// rules before it sends the form. We check again here because anyone can call
// the API without our page.
//
// This file has no database code. Checks that need the database (does this
// category exist? is this project yours?) are done in the controllers.
// =============================================================================

const RequestError = require('./RequestError');
const { IDP_PAGE_SIZE, IDP_SORT_VALUES } = require('../entity/InteriorDesignProject');

const PROJECT_FIELDS = ['name', 'description', 'propertyType', 'designStyle'];

// True for a real calendar date written as YYYY-MM-DD. Reading the date back
// catches impossible dates such as 2026-02-30.
function isDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// The ID in the web address arrives as text. A bad ID can never match a project,
// so we answer 404 right away.
function projectIdFromUrl(id) {
  if (!/^[1-9][0-9]*$/.test(String(id)) || Number(id) > 2147483647) {
    throw new RequestError(404, 'Project not found.');
  }
  return Number(id);
}

// -----------------------------------------------------------------------------
// checkProject
// Checks the project form. status decides the rules:
//   'current' = no completion date (it is cleared)
//   'past'    = a valid completion date is required
// Returns { values, errors }. The controller adds the category check (it needs
// the database) and then throws one 422 error if errors has anything.
// -----------------------------------------------------------------------------
function checkProject(body, status) {
  const values = {};
  const errors = {};

  for (const field of PROJECT_FIELDS) {
    const value = body?.[field];
    if (field === 'name') {
      if (typeof value !== 'string' || !value.trim()) errors.name = 'Enter a project name.';
      else if (value.trim().length > 160) errors.name = 'Use 160 characters or less.';
      else values.name = value.trim();
    } else if (value === undefined || value === null || value === '') {
      values[field] = null; // optional field left empty
    } else if (typeof value !== 'string') {
      errors[field] = 'Enter text for this field.';
    } else if (value.trim().length > (field === 'description' ? 5000 : 80)) {
      errors[field] = field === 'description' ? 'Use 5,000 characters or less.' : 'Use 80 characters or less.';
    } else {
      values[field] = value.trim() || null;
    }
  }

  if (status === 'past') {
    if (!isDateOnly(body?.completionDate)) errors.completionDate = 'Enter a valid completion date.';
    else values.completionDate = body.completionDate;
  } else {
    values.completionDate = null;
  }

  // The category is optional. Here we only check its shape (a whole number, or
  // empty to remove it). The controller checks that the category exists.
  if (Object.hasOwn(body || {}, 'categoryId')) {
    const categoryId = body.categoryId;
    if (categoryId === null || categoryId === '') {
      values.categoryId = null;
    } else if (!/^[1-9][0-9]*$/.test(String(categoryId)) || Number(categoryId) > 2147483647) {
      errors.categoryId = 'Choose an existing project category.';
    } else {
      values.categoryId = Number(categoryId);
    }
  }

  return { values, errors };
}

// -----------------------------------------------------------------------------
// checkSearch
// Checks the list options: q (search text), sort, page and pageSize.
// Returns { query, sort, page }, or throws a 422 error.
// -----------------------------------------------------------------------------
function checkSearch(params) {
  const query = String(params.q || '').trim();
  if (query.length > 160) throw new RequestError(422, 'Use 160 characters or less for search.');

  const sort = params.sort === undefined ? 'newest' : params.sort;
  if (Object.keys(params).some((key) => key.startsWith('sort['))
    || typeof sort !== 'string' || !IDP_SORT_VALUES.includes(sort)) {
    throw new RequestError(422, 'Choose a valid project sort order.');
  }

  const pageValue = params.page === undefined ? '1' : params.page;
  if (typeof pageValue !== 'string' || !/^[1-9]\d*$/.test(pageValue) || Number(pageValue) > 1000000) {
    throw new RequestError(422, 'Enter a valid page number.');
  }

  if (params.pageSize !== undefined
    && (typeof params.pageSize !== 'string' || params.pageSize !== String(IDP_PAGE_SIZE))) {
    throw new RequestError(422, `Page size must be ${IDP_PAGE_SIZE}.`);
  }

  return { query, sort, page: Number(pageValue) };
}

module.exports = { checkProject, checkSearch, projectIdFromUrl, isDateOnly };
