// =============================================================================
// ROUTES: companies.js             (the HTTP bridge, not a BCE class)
// User stories #13-17: an Interior Designer creates, views, updates, deletes
// and searches their own company information.
//
// There is no company ID in any address. A designer can only reach their own
// company, because the controller always uses req.auth.accountId (read from the
// login session on the server), never an ID that the browser sends.
// =============================================================================

const express = require('express');

const CreateCompanyC = require('../controller/CreateCompanyC'); // #13
const ViewCompanyC = require('../controller/ViewCompanyC'); // #14
const UpdateCompanyC = require('../controller/UpdateCompanyC'); // #15
const DeleteCompanyC = require('../controller/DeleteCompanyC'); // #16
const SearchCompanyC = require('../controller/SearchCompanyC'); // #17

const router = express.Router();
const create = new CreateCompanyC();
const view = new ViewCompanyC();
const update = new UpdateCompanyC();
const remove = new DeleteCompanyC();
const search = new SearchCompanyC();

router.get('/', async (req, res) => res.json(await search.searchCompanies(req.auth.accountId, req.query.keyword))); // #17
router.get('/mine', async (req, res) => res.json(await view.viewCompany(req.auth.accountId))); // #14
router.post('/', async (req, res) => res.status(201).json(await create.createCompany(req.auth.accountId, req.body))); // #13
router.put('/mine', async (req, res) => res.json(await update.updateCompany(req.auth.accountId, req.body))); // #15
router.delete('/mine', async (req, res) => res.json(await remove.deleteCompany(req.auth.accountId))); // #16

module.exports = router;
