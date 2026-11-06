const PlatformReport = require('../entity/PlatformReport');
const DAY = 86400000;
function reportPeriod(period,date) {
  if (!['daily','weekly','monthly'].includes(period) || typeof date !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) throw Object.assign(new Error('Choose a report period and valid date.'),{status:400});
  const calendar = new Date(date+'T00:00:00.000Z');
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0,10)!==date || calendar.getUTCFullYear()<1900 || calendar.getUTCFullYear()>9998) throw Object.assign(new Error('Choose a valid date.'),{status:400});
  const start = new Date(calendar);
  let end;
  if (period==='weekly') start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));
  if (period==='monthly') {
    start.setUTCDate(1); end = new Date(start); end.setUTCMonth(end.getUTCMonth()+1);
  } else end = new Date(start.getTime()+(period==='weekly'?7:1)*DAY);
  // Singapore has a fixed UTC+08 offset. Bounds are start-inclusive/end-exclusive.
  return {period,date,timezone:'Asia/Singapore',start:new Date(start.getTime()-8*3600000).toISOString(),endExclusive:new Date(end.getTime()-8*3600000).toISOString()};
}
class GenerateReportC {
  async generateReport(query) {
    const range = reportPeriod(query.period,query.date);
    return {...range, counts:await PlatformReport.generateReport(range)};
  }
}
module.exports = { GenerateReportC, reportPeriod };
