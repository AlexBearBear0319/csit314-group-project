// =============================================================================
// CONTROLLER: ManageIDPImageC             (BCE: Controller layer)
// The photo part of the designer's stories #20, #22 (current IDP) and #25, #27
// (past IDP): add, rename, reorder and remove the photos of a project.
//
// How a photo upload works (the photo goes straight to Supabase Storage, so our
// server never has to carry big files):
//   1. createUploadUrl   check the file details, plan the upload (an "intent"
//                        row), and ask storage for a one-time upload link
//   2. the page sends the file to storage with that link
//   3. completeUpload    check that the file in storage is really the planned
//                        type and size, then save the ProjectImage row
//   (cancelUpload undoes step 1 if the page gives up.)
//
// Every method first checks that the project is THIS designer's (and has the
// status of the page). A designer can never touch another designer's photos.
// =============================================================================

const crypto = require('node:crypto');
const path = require('node:path');
const InteriorDesignProject = require('../entity/InteriorDesignProject');
const IdpImageUploadIntent = require('../entity/IdpImageUploadIntent');
const IdpImageCleanupTask = require('../entity/IdpImageCleanupTask');
const ProjectImage = require('../entity/ProjectImage');
const RequestError = require('./RequestError');
const { projectIdFromUrl } = require('./designerIdpValidation');
const { removeFiles } = require('./storageCleanup');
const {
  ALLOWED_CONTENT_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  bucketName,
  createSignedReadUrl,
  createSignedUploadUrl,
  removeObjects,
  verifyObject,
} = require('../storage/IdpImageStorage');

const FILE_EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const UPLOAD_TTL_MS = 2 * 60 * 60 * 1000; // an upload link lasts 2 hours
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Keeps only the file name (no folders, no hidden control characters), max 255.
function cleanFileName(value) {
  if (typeof value !== 'string') return '';
  const name = value.split(/[\\/]/).pop().replace(/[\u0000-\u001f]/g, '').trim();
  return name.slice(0, 255);
}

// Checks the file details the page sent. Returns the clean values, or throws a
// 422 error with a message for the designer.
function checkUpload(body) {
  const fileName = cleanFileName(body?.fileName);
  const contentType = body?.contentType;
  const sizeBytes = Number(body?.sizeBytes);
  const altText = typeof body?.altText === 'string' ? body.altText.trim() : '';
  if (!fileName) throw new RequestError(422, 'Choose an image file.');
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) throw new RequestError(422, 'Choose a JPEG, PNG or WebP image.');
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    throw new RequestError(422, 'Image must be 5 MB or smaller.');
  }
  if (altText.length > 240) throw new RequestError(422, 'Use 240 characters or less for the image description.');
  // With no description we use the file name, so every photo has some text.
  return { fileName, contentType, sizeBytes, altText: altText || path.parse(fileName).name.slice(0, 240) };
}

// Picks a message for the designer when storage fails.
function storageMessage(error) {
  const message = String(error?.message || 'Storage is not ready.');
  return message.includes('configured') || message.includes('Storage') ? message : 'Storage could not finish this image. Try again.';
}

// A short-lived link to a photo, or null if storage cannot make one.
async function readLink(storagePath) {
  try {
    return await createSignedReadUrl(storagePath);
  } catch {
    return null;
  }
}

class ManageIDPImageC {
  // Every method starts here: the project must exist, be this designer's, and
  // have the status of the page. Returns the project, or throws 404.
  async ownedProject(designerAccountId, status, projectId) {
    const project = await InteriorDesignProject.findOwned({
      id: projectIdFromUrl(projectId),
      designerAccountId,
      status,
    });
    if (!project) throw new RequestError(404, 'Project not found.');
    return project;
  }

  // ---------------------------------------------------------------------------
  // Step 1 of an upload.
  // Receives: body = { fileName, contentType, sizeBytes, altText }
  // Returns:  { upload: { id, path, token, bucket, expiresAt } } for the page to
  //           send the file to storage.
  // ---------------------------------------------------------------------------
  async createUploadUrl(designerAccountId, status, projectId, body) {
    const project = await this.ownedProject(designerAccountId, status, projectId);
    const file = checkUpload(body);

    // The file goes to <designer>/<project>/<random id>.<ext>. The random id
    // stops two photos from ever sharing a path.
    const id = crypto.randomUUID();
    const storagePath = `${designerAccountId}/${project.id}/${id}.${FILE_EXTENSION[file.contentType]}`;
    const expiresAt = new Date(Date.now() + UPLOAD_TTL_MS);
    const intent = await IdpImageUploadIntent.createIntent({
      id,
      projectId: project.id,
      designerAccountId,
      storagePath,
      ...file,
      expiresAt,
    });

    try {
      const signed = await createSignedUploadUrl(storagePath);
      return {
        upload: { id: intent.id, path: storagePath, token: signed.token, bucket: bucketName(), expiresAt: expiresAt.toISOString() },
      };
    } catch (error) {
      // Storage could not give a link, so the plan is useless. Remove it.
      await IdpImageUploadIntent.deleteIntent(intent);
      throw new RequestError(503, storageMessage(error));
    }
  }

  // ---------------------------------------------------------------------------
  // Step 3 of an upload: the file is in storage, so we check it and save the row.
  // Receives: intentId = the id from step 1
  // Returns:  { image: { id, fileName, contentType, sizeBytes, altText, sortOrder, url } }
  // ---------------------------------------------------------------------------
  async completeUpload(designerAccountId, status, projectId, intentId) {
    const project = await this.ownedProject(designerAccountId, status, projectId);

    const intent = UUID.test(String(intentId)) && await IdpImageUploadIntent.findActive({
      id: intentId,
      projectId: project.id,
      designerAccountId,
    });
    if (!intent) throw new RequestError(404, 'Upload link expired. Choose the image again.');

    // Read the real file from storage and compare it with the plan. We never
    // trust the type and size the page told us earlier.
    let verified;
    try {
      verified = await verifyObject(intent.storagePath);
      if (verified.contentType !== intent.contentType || verified.sizeBytes !== intent.sizeBytes) {
        throw new Error('Image details do not match the file. Choose it again.');
      }
    } catch (error) {
      await this.discardUpload(intent, designerAccountId);
      throw new RequestError(422, storageMessage(error));
    }

    // Save the image row and delete the intent together.
    let image;
    try {
      image = await ProjectImage.createFromIntent({ projectId: project.id, intent, verified });
    } catch {
      await this.discardUpload(intent, designerAccountId);
      throw new RequestError(500, 'The image could not be saved. Try again.');
    }

    return {
      image: {
        id: image.id,
        fileName: image.fileName,
        contentType: image.contentType,
        sizeBytes: image.sizeBytes,
        altText: image.altText,
        sortOrder: image.sortOrder,
        url: await readLink(image.storagePath),
      },
    };
  }

  // A failed upload: remove the file from storage (and write a cleanup task if
  // that fails), then delete the intent row.
  async discardUpload(intent, designerAccountId) {
    const cleanup = await removeObjects([intent.storagePath]);
    if (cleanup.failed?.length) await IdpImageCleanupTask.queue([intent.storagePath], designerAccountId);
    await IdpImageUploadIntent.deleteIntent(intent).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // The page gives up on an upload. Delete the plan and remove any file.
  // Returns { cancelled: true, cleanupPending }
  // ---------------------------------------------------------------------------
  async cancelUpload(designerAccountId, status, projectId, intentId) {
    const project = await this.ownedProject(designerAccountId, status, projectId);

    const intent = UUID.test(String(intentId)) && await IdpImageUploadIntent.cancelIntent({
      id: intentId,
      projectId: project.id,
      designerAccountId,
    });
    if (!intent) throw new RequestError(404, 'Upload link not found.');

    const cleanup = await removeFiles([intent.storagePath]);
    return { cancelled: true, cleanupPending: cleanup.pending > 0 };
  }

  // ---------------------------------------------------------------------------
  // Change a photo's description and/or its position.
  // Receives: body = { altText } and/or { sortOrder }
  // Returns:  { image: { id, altText, sortOrder, url } }
  // ---------------------------------------------------------------------------
  async updateImage(designerAccountId, status, projectId, imageId, body) {
    const project = await this.ownedProject(designerAccountId, status, projectId);
    const image = /^[1-9][0-9]*$/.test(String(imageId)) && await ProjectImage.findImage(imageId, project.id);
    if (!image) throw new RequestError(404, 'Image not found.');

    const updates = {};
    if (body?.altText !== undefined) {
      if (typeof body.altText !== 'string' || body.altText.trim().length > 240) {
        throw new RequestError(422, 'Use 240 characters or less for the image description.');
      }
      updates.altText = body.altText.trim();
    }
    if (body?.sortOrder !== undefined) {
      const sortOrder = Number(body.sortOrder);
      if (!Number.isInteger(sortOrder) || sortOrder < 0) throw new RequestError(422, 'Image order is not valid.');
      updates.sortOrder = sortOrder;
    }
    if (Object.keys(updates).length === 0) throw new RequestError(422, 'There are no image changes to save.');

    await ProjectImage.updateImage(image, updates);
    return { image: { id: image.id, altText: image.altText, sortOrder: image.sortOrder, url: await readLink(image.storagePath) } };
  }

  // ---------------------------------------------------------------------------
  // Remove a photo: the row is deleted, then the file is removed from storage.
  // Returns { deleted: true, cleanupPending }
  // ---------------------------------------------------------------------------
  async deleteImage(designerAccountId, status, projectId, imageId) {
    const project = await this.ownedProject(designerAccountId, status, projectId);

    const image = /^[1-9][0-9]*$/.test(String(imageId)) && await ProjectImage.deleteImage({
      id: imageId,
      projectId: project.id,
      designerAccountId,
    });
    if (!image) throw new RequestError(404, 'Image not found.');

    const cleanup = await removeFiles([image.storagePath]);
    return { deleted: true, cleanupPending: cleanup.pending > 0 };
  }
}

module.exports = ManageIDPImageC;
