const router = require('express').Router();
const { GenerateReportC } = require('../controller/GenerateReportC');
const controller = new GenerateReportC();
router.get('/',async(req,res)=>res.json(await controller.generateReport(req.query)));
router.use((error,req,res,next)=>{
  if (error.status===400) return res.status(400).json({message:error.message});
  return next(error);
});
module.exports = router;
