const express = require('express');
const CreateIDPCategoryC = require('../controller/CreateIDPCategoryC');
const ViewIDPCategoryC = require('../controller/ViewIDPCategoryC');
const UpdateIDPCategoryC = require('../controller/UpdateIDPCategoryC');
const DeleteIDPCategoryC = require('../controller/DeleteIDPCategoryC');
const SearchIDPCategoryC = require('../controller/SearchIDPCategoryC');

const router = express.Router();
const create = new CreateIDPCategoryC();
const view = new ViewIDPCategoryC();
const update = new UpdateIDPCategoryC();
const remove = new DeleteIDPCategoryC();
const search = new SearchIDPCategoryC();

function sendCategory(res, category, status = 200) {
  if (!category) return res.status(404).json({ message: 'IDP category not found.' });
  return res.status(status).json(category);
}

router.get('/', async (req, res) => res.json(await search.searchCategories(req.query.keyword)));
router.post('/', async (req, res) => sendCategory(res, await create.createCategory(req.body), 201));
router.get('/:id', async (req, res) => sendCategory(res, await view.viewCategory(req.params.id)));
router.put('/:id', async (req, res) => sendCategory(res, await update.updateCategory(req.params.id, req.body)));
router.delete('/:id', async (req, res) => {
  const deleted = await remove.deleteCategory(req.params.id);
  if (!deleted) return res.status(404).json({ message: 'IDP category not found.' });
  return res.json({ message: 'IDP category deleted.' });
});

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.name === 'SequelizeUniqueConstraintError') {
    const message = 'An IDP category with this name already exists.';
    return res.status(409).json({ message, errors: { name: message } });
  }
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({ message: 'This IDP category is in use and cannot be deleted.' });
  }
  if (error.status === 400) return res.status(400).json({ message: error.message, errors: error.errors });
  console.error('IDP category request failed:', error);
  return res.status(500).json({ message: 'Unable to process the IDP category. Try again.' });
});

module.exports = router;
