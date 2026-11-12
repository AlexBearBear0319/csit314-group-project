// =============================================================================
// ROUTES: idpCategories.js         (the HTTP bridge, not a BCE class)
// User stories #39-43: the Platform Manager creates, views, updates, deletes
// and searches IDP categories. This file only matches an address to a
// controller method. The controllers make every decision.
// =============================================================================

const express = require('express');

const CreateIDPCategoryC = require('../controller/CreateIDPCategoryC'); // #39
const ViewIDPCategoryC = require('../controller/ViewIDPCategoryC'); // #40
const UpdateIDPCategoryC = require('../controller/UpdateIDPCategoryC'); // #41
const DeleteIDPCategoryC = require('../controller/DeleteIDPCategoryC'); // #42
const SearchIDPCategoryC = require('../controller/SearchIDPCategoryC'); // #43

const router = express.Router();
const create = new CreateIDPCategoryC();
const view = new ViewIDPCategoryC();
const update = new UpdateIDPCategoryC();
const remove = new DeleteIDPCategoryC();
const search = new SearchIDPCategoryC();

router.get('/', async (req, res) => res.json(await search.searchCategories(req.query.keyword))); // #43
router.post('/', async (req, res) => res.status(201).json(await create.createCategory(req.body))); // #39
router.get('/:id', async (req, res) => res.json(await view.viewCategory(req.params.id))); // #40
router.put('/:id', async (req, res) => res.json(await update.updateCategory(req.params.id, req.body))); // #41
router.delete('/:id', async (req, res) => res.json(await remove.deleteCategory(req.params.id))); // #42

module.exports = router;
