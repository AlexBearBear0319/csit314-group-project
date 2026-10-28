const express = require('express');
const CreateUserProfileC = require('../controller/CreateUserProfileC');
const ViewUserProfileC = require('../controller/ViewUserProfileC');
const UpdateUserProfileC = require('../controller/UpdateUserProfileC');
const SuspendUserProfileC = require('../controller/SuspendUserProfileC');
const SearchUserProfileC = require('../controller/SearchUserProfileC');

const router = express.Router();
const create = new CreateUserProfileC();
const view = new ViewUserProfileC();
const update = new UpdateUserProfileC();
const suspend = new SuspendUserProfileC();
const search = new SearchUserProfileC();

function sendProfile(res, profile, status = 200) {
  if (!profile) return res.status(404).json({ message: 'User profile not found.' });
  return res.status(status).json(profile);
}

router.get('/', async (req, res) => res.json(await search.searchProfiles(req.query.keyword)));
router.post('/', async (req, res) => sendProfile(res, await create.createProfile(req.body), 201));
router.get('/:id', async (req, res) => sendProfile(res, await view.viewProfile(req.params.id)));
router.put('/:id', async (req, res) => sendProfile(res, await update.updateProfile(req.params.id, req.body)));
router.post('/:id/suspend', async (req, res) => sendProfile(res, await suspend.suspendProfile(req.params.id)));
router.post('/:id/activate', async (req, res) => sendProfile(res, await suspend.activateProfile(req.params.id)));

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'A user profile with this name already exists.',
      errors: { name: 'A user profile with this name already exists.' } });
  }
  if (error.status === 400) return res.status(400).json({ message: error.message, errors: error.errors });
  console.error('User profile request failed:', error);
  return res.status(500).json({ message: 'Unable to process the user profile. Try again.' });
});

module.exports = router;
