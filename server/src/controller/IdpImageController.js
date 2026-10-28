const crypto = require('node:crypto');
const path = require('node:path');
const { Op } = require('sequelize');
const {
  sequelize,
  InteriorDesignProject,
  ProjectImage,
  IdpImageUploadIntent,
  IdpImageCleanupTask,
} = require('../entity');
const {
  ALLOWED_CONTENT_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  bucketName,
  createSignedReadUrl,
  createSignedUploadUrl,
  removeObjects,
  verifyObject,
} = require('../storage/IdpImageStorage');
const { retryCleanup, saveCleanupTasks } = require('./IdpController');

const FILE_EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const UPLOAD_TTL_MS = 2 * 60 * 60 * 1000;

function cleanFileName(value) {
  if (typeof value !== 'string') return '';
  const name = value.split(/[\\/]/).pop().replace(/[\u0000-\u001f]/g, '').trim();
  return name.slice(0, 255);
}

function validateUpload(body) {
  const fileName = cleanFileName(body?.fileName);
  const contentType = body?.contentType;
  const sizeBytes = Number(body?.sizeBytes);
  const altText = typeof body?.altText === 'string' ? body.altText.trim() : '';
  if (!fileName) return { error: 'Choose an image file.' };
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) return { error: 'Choose a JPEG, PNG or WebP image.' };
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_IMAGE_SIZE_BYTES) return { error: 'Image must be 5 MB or smaller.' };
  if (altText.length > 240) return { error: 'Use 240 characters or less for the image description.' };
  return {
    value: {
      fileName,
      contentType,
      sizeBytes,
      altText: altText || path.parse(fileName).name.slice(0, 240),
    },
  };
}

async function ownedProject(req, status, transaction) {
  return InteriorDesignProject.findOne({
    where: { id: req.params.id, designerAccountId: req.auth.accountId, status },
    transaction,
  });
}

async function queueCleanup(storagePath, accountId) {
  if (!storagePath) return;
  await IdpImageCleanupTask.findOrCreate({
    where: { storagePath },
    defaults: { designerAccountId: accountId, storagePath, attempts: 0 },
  });
}

function storageMessage(error) {
  const message = String(error?.message || 'Storage is not ready.');
  return message.includes('configured') || message.includes('Storage') ? message : 'Storage could not finish this image. Try again.';
}

class IdpImageController {
  static async createUploadUrl(req, res, next, status) {
    try {
      const project = await ownedProject(req, status);
      if (!project) return res.status(404).json({ message: 'Project not found.' });
      const checked = validateUpload(req.body);
      if (checked.error) return res.status(422).json({ message: checked.error });

      const id = crypto.randomUUID();
      const extension = FILE_EXTENSION[checked.value.contentType];
      const storagePath = `${req.auth.accountId}/${project.id}/${id}.${extension}`;
      const expiresAt = new Date(Date.now() + UPLOAD_TTL_MS);
      const intent = await IdpImageUploadIntent.create({
        id,
        projectId: project.id,
        designerAccountId: req.auth.accountId,
        storagePath,
        ...checked.value,
        expiresAt,
      });

      try {
        const signed = await createSignedUploadUrl(storagePath);
        res.set('Cache-Control', 'no-store');
        return res.status(201).json({
          upload: {
            id: intent.id,
            path: storagePath,
            token: signed.token,
            bucket: bucketName(),
            expiresAt: expiresAt.toISOString(),
          },
        });
      } catch (error) {
        await intent.destroy();
        return res.status(503).json({ message: storageMessage(error) });
      }
    } catch (error) {
      return next(error);
    }
  }

  static async completeUpload(req, res, next, status) {
    try {
      const project = await ownedProject(req, status);
      if (!project) return res.status(404).json({ message: 'Project not found.' });
      const intent = await IdpImageUploadIntent.findOne({
        where: {
          id: req.params.intentId,
          projectId: project.id,
          designerAccountId: req.auth.accountId,
          expiresAt: { [Op.gt]: new Date() },
        },
      });
      if (!intent) return res.status(404).json({ message: 'Upload link expired. Choose the image again.' });

      let verified;
      try {
        verified = await verifyObject(intent.storagePath);
        if (verified.contentType !== intent.contentType || verified.sizeBytes !== intent.sizeBytes) {
          throw new Error('Image details do not match the file. Choose it again.');
        }
      } catch (error) {
        const cleanup = await removeObjects([intent.storagePath]);
        if (cleanup.failed?.length) await queueCleanup(intent.storagePath, req.auth.accountId);
        await intent.destroy();
        return res.status(422).json({ message: storageMessage(error) });
      }

      const transaction = await sequelize.transaction();
      let image;
      try {
        image = await ProjectImage.create({
          projectId: project.id,
          storagePath: intent.storagePath,
          fileName: intent.fileName,
          contentType: verified.contentType,
          sizeBytes: verified.sizeBytes,
          altText: intent.altText,
          sortOrder: await ProjectImage.count({ where: { projectId: project.id }, transaction }),
        }, { transaction });
        await intent.destroy({ transaction });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        const cleanup = await removeObjects([intent.storagePath]);
        if (cleanup.failed?.length) await queueCleanup(intent.storagePath, req.auth.accountId);
        await intent.destroy().catch(() => {});
        return res.status(500).json({ message: 'The image could not be saved. Try again.' });
      }

      let url = null;
      try {
        url = await createSignedReadUrl(image.storagePath);
      } catch {
        // The metadata is saved. A later project view can request a new link.
      }
      return res.status(201).json({
        image: {
          id: image.id,
          fileName: image.fileName,
          contentType: image.contentType,
          sizeBytes: image.sizeBytes,
          altText: image.altText,
          sortOrder: image.sortOrder,
          url,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  static async cancelUpload(req, res, next, status) {
    try {
      const transaction = await sequelize.transaction();
      let intent;
      try {
        const project = await ownedProject(req, status, transaction);
        if (!project) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Project not found.' });
        }
        intent = await IdpImageUploadIntent.findOne({
          where: {
            id: req.params.intentId,
            projectId: project.id,
            designerAccountId: req.auth.accountId,
          },
          transaction,
          lock: transaction.LOCK?.UPDATE,
        });
        if (!intent) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Upload link not found.' });
        }
        await saveCleanupTasks([intent.storagePath], req.auth.accountId, transaction);
        await intent.destroy({ transaction });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      const cleanup = await retryCleanup([intent.storagePath]);
      return res.json({ cancelled: true, cleanupPending: cleanup.pending > 0 });
    } catch (error) {
      return next(error);
    }
  }

  static async updateImage(req, res, next, status) {
    try {
      const project = await ownedProject(req, status);
      if (!project) return res.status(404).json({ message: 'Project not found.' });
      const image = await ProjectImage.findOne({ where: { id: req.params.imageId, projectId: project.id } });
      if (!image) return res.status(404).json({ message: 'Image not found.' });

      const updates = {};
      if (req.body?.altText !== undefined) {
        if (typeof req.body.altText !== 'string' || req.body.altText.trim().length > 240) {
          return res.status(422).json({ message: 'Use 240 characters or less for the image description.' });
        }
        updates.altText = req.body.altText.trim();
      }
      if (req.body?.sortOrder !== undefined) {
        const sortOrder = Number(req.body.sortOrder);
        if (!Number.isInteger(sortOrder) || sortOrder < 0) return res.status(422).json({ message: 'Image order is not valid.' });
        updates.sortOrder = sortOrder;
      }
      if (Object.keys(updates).length === 0) return res.status(422).json({ message: 'There are no image changes to save.' });
      await image.update(updates);
      let url = null;
      try {
        url = await createSignedReadUrl(image.storagePath);
      } catch {
        // Keep the saved metadata in the response if Storage cannot sign now.
      }
      return res.json({ image: { id: image.id, altText: image.altText, sortOrder: image.sortOrder, url } });
    } catch (error) {
      return next(error);
    }
  }

  static async deleteImage(req, res, next, status) {
    try {
      const transaction = await sequelize.transaction();
      let image;
      try {
        const project = await ownedProject(req, status, transaction);
        if (!project) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Project not found.' });
        }
        image = await ProjectImage.findOne({
          where: { id: req.params.imageId, projectId: project.id },
          transaction,
          lock: transaction.LOCK?.UPDATE,
        });
        if (!image) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Image not found.' });
        }
        await saveCleanupTasks([image.storagePath], req.auth.accountId, transaction);
        await image.destroy({ transaction });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      const cleanup = await retryCleanup([image.storagePath]);
      return res.json({ deleted: true, cleanupPending: cleanup.pending > 0 });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = IdpImageController;
