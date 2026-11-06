const router = require('express').Router();
const create = new (require('../controller/CreateCompanyC'))();
const view = new (require('../controller/ViewCompanyC'))();
const update = new (require('../controller/UpdateCompanyC'))();
const remove = new (require('../controller/DeleteCompanyC'))();
const search = new (require('../controller/SearchCompanyC'))();
function send(res, company, status = 200) {
  return company ? res.status(status).json(company) : res.status(404).json({ message: 'Company not found.' });
}
router.get('/', async (req,res) => res.json(await search.searchCompanies(req.auth.accountId, req.query.keyword)));
router.get('/mine', async (req,res) => send(res, await view.viewCompany(req.auth.accountId)));
router.post('/', async (req,res) => send(res, await create.createCompany(req.auth.accountId, req.body), 201));
router.put('/mine', async (req,res) => send(res, await update.updateCompany(req.auth.accountId, req.body)));
router.delete('/mine', async (req,res) => {
  if (!await remove.deleteCompany(req.auth.accountId)) return res.status(404).json({ message: 'Company not found.' });
  return res.json({ message: 'Company deleted.' });
});
router.use((error,req,res,next) => {
  if (res.headersSent) return next(error);
  if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'You already have company information. Update it instead.' });
  if (error.status === 400) return res.status(400).json({ message: error.message, errors: error.errors });
  return next(error);
});
module.exports = router;
