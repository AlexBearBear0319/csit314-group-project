const { Op, col, fn, where } = require('sequelize');
const {
  sequelize,
  InteriorDesignProject,
  ProjectImage,
  UserAccount,
  UserProfile,
  Company,
  IDPCategory,
} = require('./index');

const PAGE_SIZE = 9;

function visibleDesigner(includeCompany = false) {
  const include = [{
    model: UserProfile,
    attributes: [],
    required: true,
    where: { status: 'active', name: 'Interior Designer' },
  }];
  if (includeCompany) {
    include.push({ model: Company, as: 'company', attributes: ['name'], required: false });
  }
  return {
    model: UserAccount,
    as: 'designer',
    attributes: includeCompany ? ['id', 'name'] : [],
    required: true,
    where: { status: 'active' },
    include,
  };
}

// The BCE query entity maps IDP Database to the existing Sequelize tables.
// projectID, designerID, statusID and projectName map to id, designerAccountId,
// status and name. ProjectImage contains the diagram's projectImages.
class IDPDatabase {
  static async retrieveMatchingIDP({ keyword = '', propertyType = '', designStyle = '', page = 1, sort = 'date' }) {
    const condition = { status: 'current' };
    const term = keyword.trim().toLowerCase();
    if (term) {
      const contains = sequelize.getDialect() === 'postgres' ? 'strpos' : 'instr';
      condition[Op.or] = ['name', 'description', 'property_type', 'design_style'].map(field =>
        where(fn(contains, fn('LOWER', col(`InteriorDesignProject.${field}`)), term), { [Op.gt]: 0 }));
    }
    if (propertyType) condition.propertyType = propertyType;
    if (designStyle) condition.designStyle = designStyle;

    // 'date' is newest first and is what Customers see unless they change it.
    const orders = {
      fifo: [['createdAt', 'ASC'], ['id', 'ASC']],
      date: [['createdAt', 'DESC'], ['id', 'DESC']],
      alphabetical: [[fn('LOWER', col('InteriorDesignProject.name')), 'ASC'], ['id', 'ASC']],
    };
    const { rows, count } = await InteriorDesignProject.findAndCountAll({
      where: condition,
      include: [visibleDesigner()],
      order: orders[sort],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    return {
      projects: rows.map(project => this.returnIDPDetails(project)),
      total: count,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(count / PAGE_SIZE),
    };
  }

  static searchByName(projectName, options = {}) {
    // The diagram permits names and keywords through the same search field.
    return this.retrieveMatchingIDP({ ...options, keyword: projectName });
  }

  static searchByKeyword(searchKeyword, options = {}) {
    return this.retrieveMatchingIDP({ ...options, keyword: searchKeyword });
  }

  static retrieveIDP(options) {
    return this.retrieveMatchingIDP(options);
  }

  static getIDPByID(projectID, transaction) {
    return InteriorDesignProject.findOne({
      // The ongoing list stays current-only. Existing shortlist/count callers
      // also open past projects through this established detail endpoint.
      where: { id: projectID, status: ['current', 'past'] },
      include: [
        visibleDesigner(true),
        { model: ProjectImage, as: 'images' },
        { model: IDPCategory, as: 'category', attributes: ['id', 'name'], required: false },
      ],
      transaction,
    });
  }

  static async getIDPDetails(projectID) {
    return sequelize.transaction(async transaction => {
      const project = await this.getIDPByID(projectID, transaction);
      if (!project) return null;
      await InteriorDesignProject.increment('viewCount', {
        by: 1,
        where: { id: project.id },
        transaction,
        silent: true,
      });
      return {
        ...this.returnIDPDetails(project),
        images: project.images,
      };
    });
  }

  static returnIDPDetails(project) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      propertyType: project.propertyType,
      designStyle: project.designStyle,
      status: project.status,
      completionDate: project.completionDate,
      categoryId: project.categoryId,
      categoryName: project.category?.name || null,
      designerName: project.designer?.name || null,
      companyName: project.designer?.company?.name || null,
    };
  }

  static async availableFilters() {
    const rows = await InteriorDesignProject.findAll({
      attributes: ['propertyType', 'designStyle'],
      where: { status: 'current' },
      include: [visibleDesigner()],
    });
    const values = field => [...new Set(rows.map(row => row[field]).filter(Boolean))].sort();
    return { propertyTypes: values('propertyType'), designStyles: values('designStyle') };
  }
}

module.exports = IDPDatabase;
