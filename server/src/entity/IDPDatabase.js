// =============================================================================
// ENTITY: IDPDatabase              (BCE: Entity layer)
// The Customer's read-only view of the projects (stories #32 search and #33 view).
//
// It is not a table of its own. It reads the interior_design_project table
// together with the designer, their company, the category and the photos, and
// it only shows projects that a Customer is allowed to see:
//   - the project is 'current' for search/browse (a Customer can open a past
//     project from a shortlist, so view accepts both)
//   - the designer's account is active, and their profile is an active
//     "Interior Designer" profile. A suspended designer disappears from search.
//
// Like our other entities it only reads data. SearchIDPC and ViewIDPC decide
// what to ask for and check the input first.
// =============================================================================

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

// The customer's list shows 9 projects per page.
const PAGE_SIZE = 9;

// Builds the "only visible designers" condition used in every query below.
// includeCompany = also load the designer's name and company name.
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

class IDPDatabase {
  // ---------------------------------------------------------------------------
  // SEARCH + LIST (story #32, and the Customer's browse list)
  //   keyword      = text to find in name, description, property type or style
  //   propertyType / designStyle = exact filters (empty = no filter)
  //   page, sort   = 'fifo' (oldest first), 'date' (newest first) or 'alphabetical'
  // Returns { projects, total, page, pageSize, totalPages }.
  // ---------------------------------------------------------------------------
  static async retrieveIDP({ keyword = '', propertyType = '', designStyle = '', page = 1, sort = 'date' }) {
    const condition = { status: 'current' };
    const term = keyword.trim().toLowerCase();
    if (term) {
      // strpos (PostgreSQL) and instr (SQLite tests) both mean "position of text
      // in text". A position above 0 means the keyword is in there.
      const contains = sequelize.getDialect() === 'postgres' ? 'strpos' : 'instr';
      condition[Op.or] = ['name', 'description', 'property_type', 'design_style'].map((field) =>
        where(fn(contains, fn('LOWER', col(`InteriorDesignProject.${field}`)), term), { [Op.gt]: 0 }));
    }
    if (propertyType) condition.propertyType = propertyType;
    if (designStyle) condition.designStyle = designStyle;

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
      projects: rows.map((project) => IDPDatabase.returnIDPDetails(project)),
      total: count,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(count / PAGE_SIZE),
    };
  }

  // The same search, with the keyword as its own argument (story #32).
  static async searchByKeyword(searchKeyword, options = {}) {
    return IDPDatabase.retrieveIDP({ ...options, keyword: searchKeyword });
  }

  // ---------------------------------------------------------------------------
  // READ one project in full (story #33) and add 1 to its view count (story #30).
  // The read and the +1 happen in one transaction, so the count never drifts.
  // Returns the project details with its designer, company, category and photos,
  // or null if the project is not visible to Customers.
  // ---------------------------------------------------------------------------
  static async getIDPDetails(projectID) {
    return sequelize.transaction(async (transaction) => {
      const project = await InteriorDesignProject.findOne({
        where: { id: projectID, status: ['current', 'past'] },
        include: [
          visibleDesigner(true),
          { model: ProjectImage, as: 'images' },
          { model: IDPCategory, as: 'category', attributes: ['id', 'name'], required: false },
        ],
        transaction,
      });
      if (!project) return null;

      // silent: true keeps updated_at unchanged, because a view is not an edit.
      await InteriorDesignProject.increment('viewCount', {
        by: 1,
        where: { id: project.id },
        transaction,
        silent: true,
      });
      return { ...IDPDatabase.returnIDPDetails(project), images: project.images };
    });
  }

  // Builds the safe copy of a project that we send to the browser. The
  // designer's email and account ID are left out on purpose.
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

  // ---------------------------------------------------------------------------
  // READ the filter choices (the dropdowns on the Customer's search page):
  // the property types and design styles that real, visible projects have.
  // ---------------------------------------------------------------------------
  static async availableFilters() {
    const rows = await InteriorDesignProject.findAll({
      attributes: ['propertyType', 'designStyle'],
      where: { status: 'current' },
      include: [visibleDesigner()],
    });
    const values = (field) => [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort();
    return { propertyTypes: values('propertyType'), designStyles: values('designStyle') };
  }
}

module.exports = IDPDatabase;
