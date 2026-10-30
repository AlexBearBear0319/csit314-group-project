const {
  sequelize,
  InteriorDesignProject,
  ProjectImage,
  IdpImageUploadIntent,
  IdpImageCleanupTask,
} = require('../entity');
const { createSignedReadUrl, removeObjects } = require('../storage/IdpImageStorage');
const IDP_PAGE_SIZE = InteriorDesignProject.IDP_PAGE_SIZE || 9;

const PROJECT_FIELDS = ['name', 'description', 'propertyType', 'designStyle'];

function isDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateProject(body, status) {
  const values = {};
  const errors = {};
  for (const field of PROJECT_FIELDS) {
    const value = body?.[field];
    if (field === 'name') {
      if (typeof value !== 'string' || !value.trim()) errors.name = 'Enter a project name.';
      else if (value.trim().length > 160) errors.name = 'Use 160 characters or less.';
      else values.name = value.trim();
    } else if (value === undefined || value === null || value === '') {
      values[field] = null;
    } else if (typeof value !== 'string') {
      errors[field] = 'Enter text for this field.';
    } else if (value.trim().length > (field === 'description' ? 5000 : 80)) {
      errors[field] = field === 'description' ? 'Use 5,000 characters or less.' : 'Use 80 characters or less.';
    } else {
      values[field] = value.trim() || null;
    }
  }

  if (status === 'past') {
    const date = body?.completionDate;
    if (!isDateOnly(date)) {
      errors.completionDate = 'Enter a valid completion date.';
    } else {
      values.completionDate = date;
    }
  } else {
    values.completionDate = null;
  }

  return { values, errors };
}

function sendValidationError(res, errors) {
  return res.status(422).json({ message: 'Check the project details.', errors });
}

async function renderImage(image) {
  let url = null;
  try {
    url = await createSignedReadUrl(image.storagePath);
  } catch {
    // Keep saved metadata visible if Storage is offline. The page can retry.
  }
  return {
    id: image.id,
    fileName: image.fileName,
    contentType: image.contentType,
    sizeBytes: image.sizeBytes,
    altText: image.altText,
    sortOrder: image.sortOrder,
    url,
  };
}

function projectFields(project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    propertyType: project.propertyType,
    designStyle: project.designStyle,
    status: project.status,
    completionDate: project.completionDate,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

async function renderProject(project) {
  const orderedImages = [...(project.images || [])].sort((left, right) => (
    left.sortOrder - right.sortOrder || String(left.id).localeCompare(String(right.id))
  ));
  const images = await Promise.all(orderedImages.map(renderImage));

  return {
    ...projectFields(project),
    imageCount: images.length,
    images,
  };
}

async function renderProjectSummary(project) {
  // Cards need only three signed previews. The detail route loads all images
  // when the user opens the project.
  const images = await Promise.all((project.previewImages || []).map(renderImage));
  return { ...projectFields(project), imageCount: project.imageCount || 0, images };
}

async function getOwnedProject(id, req, status, transaction) {
  // Take the owner from the verified server session, never the request body.
  // The owner and collection filters also block access through a guessed ID.
  return InteriorDesignProject.findOwned({
    id,
    designerAccountId: req.auth.accountId,
    status,
    include: [{ association: 'images', order: [['sortOrder', 'ASC'], ['id', 'ASC']] }],
    transaction,
  });
}

async function saveCleanupTasks(paths, designerAccountId, transaction) {
  for (const storagePath of [...new Set(paths)]) {
    await IdpImageCleanupTask.findOrCreate({
      where: { storagePath },
      defaults: { designerAccountId, storagePath, attempts: 0 },
      transaction,
    });
  }
}

async function retryCleanup(paths) {
  if (!paths.length) return { pending: 0 };
  const result = await removeObjects(paths);
  for (const storagePath of result.removed || []) {
    await IdpImageCleanupTask.destroy({ where: { storagePath } });
  }
  for (const storagePath of result.failed || []) {
    const task = await IdpImageCleanupTask.findOne({ where: { storagePath } });
    if (task) {
      await task.update({ attempts: task.attempts + 1, lastError: String(result.error || 'Storage could not remove the image.').slice(0, 500) });
    }
  }
  return { pending: (result.failed || []).length };
}

async function createIdp(req, res, next, status) {
  try {
    const { values, errors } = validateProject(req.body, status);
    if (Object.keys(errors).length) return sendValidationError(res, errors);
    const project = await InteriorDesignProject.createOwned({
      ...values,
      status,
      designerAccountId: req.auth.accountId,
    });
    project.images = [];
    return res.status(201).json({ project: await renderProject(project) });
  } catch (error) {
    return next(error);
  }
}

async function searchIdps(req, res, next, status) {
  try {
    const query = String(req.query.q || '').trim();
    if (query.length > 160) return res.status(422).json({ message: 'Use 160 characters or less for search.' });
    const pageValue = req.query.page === undefined ? '1' : req.query.page;
    if (typeof pageValue !== 'string' || !/^[1-9]\d*$/.test(pageValue) || Number(pageValue) > 1000000) {
      return res.status(422).json({ message: 'Enter a valid page number.' });
    }
    if (req.query.pageSize !== undefined
      && (typeof req.query.pageSize !== 'string' || req.query.pageSize !== String(IDP_PAGE_SIZE))) {
      return res.status(422).json({ message: `Page size must be ${IDP_PAGE_SIZE}.` });
    }
    const page = Number(pageValue);
    const result = await InteriorDesignProject.listOwned({
      designerAccountId: req.auth.accountId,
      status,
      query,
      page,
    });
    return res.json({
      projects: await Promise.all(result.projects.map(renderProjectSummary)),
      pagination: {
        page,
        pageSize: IDP_PAGE_SIZE,
        total: result.total,
        totalPages: Math.ceil(result.total / IDP_PAGE_SIZE),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function viewIdp(req, res, next, status) {
  try {
    const project = await getOwnedProject(req.params.id, req, status);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    return res.json({ project: await renderProject(project) });
  } catch (error) {
    return next(error);
  }
}

async function updateIdp(req, res, next, status) {
  try {
    const { values, errors } = validateProject(req.body, status);
    if (Object.keys(errors).length) return sendValidationError(res, errors);
    const project = await getOwnedProject(req.params.id, req, status);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    await project.update(values);
    const updated = await getOwnedProject(project.id, req, status);
    return res.json({ project: await renderProject(updated) });
  } catch (error) {
    return next(error);
  }
}

async function deleteIdp(req, res, next, status) {
  try {
    const transaction = await sequelize.transaction();
    let project;
    let paths = [];
    try {
      project = await InteriorDesignProject.findOne({
        where: { id: req.params.id, designerAccountId: req.auth.accountId, status },
        include: [
          { association: 'images' },
          { association: 'uploadIntents' },
        ],
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      if (!project) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Project not found.' });
      }
      paths = [
        ...(project.images || []).map((image) => image.storagePath),
        ...(project.uploadIntents || []).map((intent) => intent.storagePath),
      ];
      await saveCleanupTasks(paths, req.auth.accountId, transaction);
      await project.destroy({ transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    const cleanup = await retryCleanup(paths);
    return res.json({ deleted: true, cleanupPending: cleanup.pending > 0 });
  } catch (error) {
    return next(error);
  }
}

class IdpController {
  // Current IDP use cases #20-24.
  static createCurrentIdp(req, res, next) { return createIdp(req, res, next, 'current'); }
  static searchCurrentIdps(req, res, next) { return searchIdps(req, res, next, 'current'); }
  static viewCurrentIdp(req, res, next) { return viewIdp(req, res, next, 'current'); }
  static updateCurrentIdp(req, res, next) { return updateIdp(req, res, next, 'current'); }
  static deleteCurrentIdp(req, res, next) { return deleteIdp(req, res, next, 'current'); }

  // Past IDP use cases #25-29.
  static createPastIdp(req, res, next) { return createIdp(req, res, next, 'past'); }
  static searchPastIdps(req, res, next) { return searchIdps(req, res, next, 'past'); }
  static viewPastIdp(req, res, next) { return viewIdp(req, res, next, 'past'); }
  static updatePastIdp(req, res, next) { return updateIdp(req, res, next, 'past'); }
  static deletePastIdp(req, res, next) { return deleteIdp(req, res, next, 'past'); }
}

module.exports = { IdpController, retryCleanup, saveCleanupTasks };
