const { Op, fn, col, where } = require('sequelize');
const { sequelize, InteriorDesignProject, UserAccount, UserProfile, ProjectImage } = require('./index');
const PAGE_SIZE = 9;
function visibleDesigner() {
  return { model: UserAccount, as: 'designer', attributes: [], required: true, where: { status: 'active' },
    include: [{ model: UserProfile, attributes: [], required: true, where: { status: 'active', name: 'Interior Designer' } }] };
}
class CustomerProject {
  static async searchProjects(keyword, page) {
    const term = keyword.trim().toLowerCase();
    const search = term ? { [Op.or]: ['name', 'description', 'property_type', 'design_style'].map(field =>
      where(fn(sequelize.getDialect() === 'postgres' ? 'strpos' : 'instr', fn('LOWER', col('InteriorDesignProject.' + field)), term), { [Op.gt]: 0 })) } : {};
    const result = await InteriorDesignProject.findAndCountAll({
      where: { status: ['current', 'past'], ...search }, include: [visibleDesigner()],
      order: [['updatedAt','DESC'],['id','DESC']], limit: PAGE_SIZE, offset: (page-1)*PAGE_SIZE,
    });
    return { projects: result.rows, total: result.count, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(result.count/PAGE_SIZE) };
  }
  static async viewProject(id) {
    return sequelize.transaction(async transaction => {
      const project = await InteriorDesignProject.findOne({where:{id,status:['current','past']},
        include:[visibleDesigner(),{model:ProjectImage,as:'images'}],transaction});
      if (!project) return null;
      // SQL increment prevents simultaneous views from overwriting each other.
      await InteriorDesignProject.increment('viewCount',{by:1,where:{id:project.id},transaction,silent:true});
      return project;
    });
  }
}
module.exports = CustomerProject;
