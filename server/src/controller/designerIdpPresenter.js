// =============================================================================
// CONTROLLER HELPER: designerIdpPresenter
// Turns a project from the database into the shape the page needs. The page must
// not see storage paths or internal fields, so we build a clean copy:
//   - the safe project fields
//   - every photo with a short-lived link (the photo files are private)
//   - the shortlist count (story #31)
// =============================================================================

const ShortlistItem = require('../entity/ShortlistItem');
const { IDP_PAGE_SIZE } = require('../entity/InteriorDesignProject');
const { createSignedReadUrl } = require('../storage/IdpImageStorage');

// One photo. If storage cannot make a link we still show the project, with url = null.
async function renderImage(image) {
  let url = null;
  try {
    url = await createSignedReadUrl(image.storagePath);
  } catch {
    // keep url = null
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

// The project fields the page may see.
function projectFields(project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    propertyType: project.propertyType,
    designStyle: project.designStyle,
    status: project.status,
    completionDate: project.completionDate,
    categoryId: project.categoryId,
    viewCount: project.viewCount || 0, // story #30
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

// One project in full, with all its photos in the designer's order.
async function renderProject(project) {
  const orderedImages = [...(project.images || [])].sort((left, right) => (
    left.sortOrder - right.sortOrder || String(left.id).localeCompare(String(right.id))
  ));
  const images = await Promise.all(orderedImages.map(renderImage));
  const shortlistCounts = await ShortlistItem.countsByProject([project.id]);
  return {
    ...projectFields(project),
    shortlistCount: shortlistCounts.get(project.id) || 0,
    imageCount: images.length,
    images,
  };
}

// One project of the list: only the first few photos are loaded.
async function renderProjectSummary(project, shortlistCounts) {
  const images = await Promise.all((project.previewImages || []).map(renderImage));
  return {
    ...projectFields(project),
    shortlistCount: shortlistCounts.get(project.id) || 0,
    imageCount: project.imageCount || 0,
    images,
  };
}

// The list of a page: { projects, pagination }.
async function renderProjectPage(result, page) {
  const shortlistCounts = await ShortlistItem.countsByProject(result.projects.map((project) => project.id));
  return {
    projects: await Promise.all(result.projects.map((project) => renderProjectSummary(project, shortlistCounts))),
    pagination: {
      page,
      pageSize: IDP_PAGE_SIZE,
      total: result.total,
      totalPages: Math.ceil(result.total / IDP_PAGE_SIZE),
    },
  };
}

module.exports = { renderImage, renderProject, renderProjectPage };
