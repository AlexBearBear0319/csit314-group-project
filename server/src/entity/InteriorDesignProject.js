// =============================================================================
// ENTITY: InteriorDesignProject    (BCE: Entity layer)
// An IDP (interior design project) of an Interior Designer. A project is either
// 'current' (still ongoing) or 'past' (finished, with a completion date).
//
// Table: interior_design_project (name, description, propertyType, designStyle,
//        status, completionDate, categoryId, viewCount, designerAccountId)
//
// Stories that use this entity:
//   #20-24  the designer manages current projects
//   #25-29  the designer manages past projects
//   #30 #31 the designer sees view count and shortlist count
//   #32 #33 customers search and view projects (through IDPDatabase)
//
// This class only does CRUD on its own table. The controllers decide what is
// allowed (for example "a designer can only touch their own projects") and call
// these methods. Every "Owned" method takes designerAccountId, so a designer can
// never read or change another designer's project.
// =============================================================================

const { DataTypes, Model, Op, col, fn, where } = require('sequelize');
const sequelize = require('../db');
const ProjectImage = require('./ProjectImage');
const IdpImageUploadIntent = require('./IdpImageUploadIntent');
const IdpImageCleanupTask = require('./IdpImageCleanupTask');

// The designer's list shows 9 projects per page.
const IDP_PAGE_SIZE = 9;

// The sort choices of the designer's list.
const IDP_SORT_ORDERS = {
  oldest: [['createdAt', 'ASC'], ['id', 'ASC']],
  newest: [['createdAt', 'DESC'], ['id', 'DESC']],
  'name-asc': [[fn('LOWER', col('name')), 'ASC'], ['id', 'ASC']],
  'name-desc': [[fn('LOWER', col('name')), 'DESC'], ['id', 'DESC']],
  recent: [['updatedAt', 'DESC'], ['id', 'DESC']],
};

class InteriorDesignProject extends Model {
  // ---------------------------------------------------------------------------
  // CREATE (stories #20 and #25). values = checked fields + status + designerAccountId.
  // ---------------------------------------------------------------------------
  static async createProject(values) {
    return InteriorDesignProject.create(values);
  }

  // ---------------------------------------------------------------------------
  // READ any project by ID (used when a Customer saves a project, story #34).
  // Returns the project, or null.
  // ---------------------------------------------------------------------------
  static async findProject(id) {
    return InteriorDesignProject.findByPk(id);
  }

  // ---------------------------------------------------------------------------
  // READ one of THIS designer's projects (stories #21, #22, #23, #26, #27, #28).
  //   status = 'current' or 'past'. Leave it out to accept either (stories #30
  //            and #31 look at any of the designer's projects).
  //   withImages = also load the photos.
  // Returns the project, or null if it does not exist or belongs to someone else.
  // ---------------------------------------------------------------------------
  static async findOwned({ id, designerAccountId, status, withImages = false }) {
    const condition = { id, designerAccountId };
    if (status) condition.status = status;
    return InteriorDesignProject.findOne({
      where: condition,
      include: withImages ? [{ association: 'images' }] : [],
    });
  }

  // ---------------------------------------------------------------------------
  // UPDATE (stories #22 and #27)
  // Saves the changes and returns the project with its photos, or null if the
  // project does not exist or is not this designer's.
  // ---------------------------------------------------------------------------
  static async updateProject({ id, designerAccountId, status, values }) {
    const project = await InteriorDesignProject.findOwned({ id, designerAccountId, status });
    if (!project) return null;
    await project.update(values);
    return InteriorDesignProject.findOwned({ id, designerAccountId, status, withImages: true });
  }

  // ---------------------------------------------------------------------------
  // DELETE (stories #23 and #28)
  // Deletes the project, and queues its photo files for removal from storage.
  // Both happen in one transaction. The photos and upload intents are deleted
  // with the project (ON DELETE CASCADE).
  // Returns { paths } (the storage paths to remove), or null if the project does
  // not exist or is not this designer's.
  // ---------------------------------------------------------------------------
  static async deleteProject({ id, designerAccountId, status }) {
    return sequelize.transaction(async (transaction) => {
      // Lock the project row only. PostgreSQL refuses FOR UPDATE on a query that
      // also joins the photo tables, so we load the photos in separate queries.
      const project = await InteriorDesignProject.findOne({
        where: { id, designerAccountId, status },
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      if (!project) return null;
      const images = await ProjectImage.findAll({ where: { projectId: project.id }, transaction });
      const intents = await IdpImageUploadIntent.findAll({ where: { projectId: project.id }, transaction });

      const paths = [
        ...images.map((image) => image.storagePath),
        ...intents.map((intent) => intent.storagePath),
      ];
      await IdpImageCleanupTask.queue(paths, designerAccountId, transaction);
      await project.destroy({ transaction });
      return { paths };
    });
  }

  // ---------------------------------------------------------------------------
  // SEARCH + LIST (stories #24 and #29)
  // The designer's projects of one status, nine per page.
  //   query = text to find in name, property type and design style (and the
  //           completion date for past projects). Empty = every project.
  //   page  = page number from 1, sort = one of the IDP_SORT_ORDERS keys
  // Returns { total, projects } where each project also has imageCount and up
  // to 3 previewImages.
  // ---------------------------------------------------------------------------
  static async listOwned({ designerAccountId, status, query, page = 1, sort = 'newest' }) {
    const whereClause = { designerAccountId, status };
    const term = String(query || '').trim().toLowerCase();

    if (term) {
      // Escape % and _ so they are searched as plain text, then wrap with % for "contains".
      const escaped = term.replace(/[\\%_]/g, '\\$&');
      const pattern = `%${escaped}%`;
      const fields = ['name', 'propertyType', 'designStyle'];
      if (status === 'past') fields.push('completionDate');
      whereClause[Op.and] = [
        {
          [Op.or]: fields.map((field) => (
            field === 'completionDate'
              ? where(sequelize.cast(col('completion_date'), 'TEXT'), { [Op.like]: pattern })
              : where(fn('LOWER', col({ propertyType: 'property_type', designStyle: 'design_style' }[field] || field)), { [Op.like]: pattern })
          )),
        },
      ];
    }

    const { count, rows } = await InteriorDesignProject.findAndCountAll({
      where: whereClause,
      order: Object.hasOwn(IDP_SORT_ORDERS, sort) ? IDP_SORT_ORDERS[sort] : IDP_SORT_ORDERS.newest,
      limit: IDP_PAGE_SIZE,
      offset: (page - 1) * IDP_PAGE_SIZE,
    });

    // Load the photos of the projects on this page in one query.
    const projectIds = rows.map((project) => project.id);
    const imageRows = projectIds.length
      ? await ProjectImage.findAll({
        attributes: ['id', 'projectId', 'storagePath', 'fileName', 'contentType', 'sizeBytes', 'altText', 'sortOrder'],
        where: { projectId: projectIds },
        order: [['sortOrder', 'ASC'], ['id', 'ASC']],
      })
      : [];
    const imagesByProject = new Map();
    for (const image of imageRows) {
      const projectImages = imagesByProject.get(image.projectId) || [];
      projectImages.push(image);
      imagesByProject.set(image.projectId, projectImages);
    }

    return {
      total: count,
      projects: rows.map((project) => {
        const images = imagesByProject.get(project.id) || [];
        return {
          ...project.get({ plain: true }),
          imageCount: images.length,
          previewImages: images.slice(0, 3),
        };
      }),
    };
  }
}

InteriorDesignProject.init(
  {
    categoryId: { type: DataTypes.INTEGER, allowNull: true, field: 'category_id' },
    viewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'view_count' }, // story #30
    name: { type: DataTypes.STRING(160), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    propertyType: { type: DataTypes.STRING(80), allowNull: true, field: 'property_type' },
    designStyle: { type: DataTypes.STRING(80), allowNull: true, field: 'design_style' },
    status: { type: DataTypes.STRING(16), allowNull: false }, // 'current' or 'past'
    completionDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'completion_date' }, // past projects only
    designerAccountId: { type: DataTypes.INTEGER, allowNull: false, field: 'designer_account_id' },
  },
  {
    sequelize,
    modelName: 'InteriorDesignProject',
    tableName: 'interior_design_project',
    underscored: true,
    indexes: [
      { fields: ['designer_account_id', 'status', 'updated_at'] },
      { fields: ['designer_account_id', 'status', 'completion_date'] },
      { fields: ['designer_account_id', 'status', 'name'] },
    ],
  }
);

module.exports = InteriorDesignProject;
module.exports.IDP_PAGE_SIZE = IDP_PAGE_SIZE;
module.exports.IDP_SORT_VALUES = Object.keys(IDP_SORT_ORDERS);
