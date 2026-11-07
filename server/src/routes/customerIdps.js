const router = require('express').Router();
const { SearchIDPController } = require('../controller/SearchIDPController');
const ViewIDPController = require('../controller/ViewIDPController');
const IDPDatabase = require('../entity/IDPDatabase');
const { createSignedReadUrl } = require('../storage/IdpImageStorage');

router.get('/filters', async (req, res) => res.json(await IDPDatabase.availableFilters()));

router.get('/', async (req, res) => {
  const searching = ['keyword', 'propertyType', 'designStyle'].some(key => Object.hasOwn(req.query, key));
  const result = searching
    ? await new SearchIDPController().receiveSearchKeyword(req.query)
    : await new ViewIDPController().retrieveIDP(req.query);
  return res.json(result);
});

router.post('/:id/view', async (req, res) => {
  const project = await new ViewIDPController().selectIDP(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const orderedImages = [...project.images].sort((left, right) =>
    left.sortOrder - right.sortOrder || left.id - right.id);
  const images = await Promise.all(orderedImages.map(async image => {
    let url = null;
    try {
      url = await createSignedReadUrl(image.storagePath);
    } catch {
      // The gallery displays an unavailable-photo state while details stay readable.
    }
    return {
      id: image.id,
      fileName: image.fileName,
      altText: image.altText,
      sortOrder: image.sortOrder,
      url,
    };
  }));
  return res.json({ ...project, images, imageCount: images.length });
});

router.use((error, req, res, next) => {
  if (error.status === 400) return res.status(400).json({ message: error.message });
  return next(error);
});

module.exports = router;
