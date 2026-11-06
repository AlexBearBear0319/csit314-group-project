const router = require('express').Router();
const search = new (require('../controller/SearchCustomerIDPC'))();
const view = new (require('../controller/ViewCustomerIDPC'))();
const { createSignedReadUrl } = require('../storage/IdpImageStorage');
function fields(project) {
  return Object.fromEntries(['id','name','description','propertyType','designStyle','status','completionDate'].map(key=>[key,project[key]]));
}
router.get('/',async (req,res) => {
  const result = await search.searchProjects(req.query);
  return res.json({...result, projects:result.projects.map(fields)});
});
router.post('/:id/view',async (req,res) => {
  const project = await view.viewProject(req.params.id);
  if (!project) return res.status(404).json({message:'Project not found.'});
  const images = await Promise.all([...project.images].sort((a,b)=>a.sortOrder-b.sortOrder || a.id-b.id).map(async image=>{
    let url = null;
    try { url = await createSignedReadUrl(image.storagePath); } catch { /* Gallery displays an unavailable-image state. */ }
    return {id:image.id,fileName:image.fileName,altText:image.altText,sortOrder:image.sortOrder,url};
  }));
  return res.json({...fields(project),images,imageCount:images.length});
});
router.use((error,req,res,next)=>{
  if (error.status === 400) return res.status(400).json({message:error.message});
  return next(error);
});
module.exports = router;
