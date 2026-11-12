// =============================================================================
// CONTROLLER: GenerateReportC             (BCE: Controller layer)
// User stories #44, #45, #46: As a Platform Manager, I want to generate a daily,
// weekly or monthly report so that I can monitor the platform's activity.
//
// Sequence for the report stories:
//   1. GenerateReportPg sends the period ('daily' | 'weekly' | 'monthly') and a date
//   2. GenerateReportC.generateReport(query)               <- THIS FILE
//        a. check the period and the date
//        b. work out the time range in Singapore time:
//             daily   = that day
//             weekly  = Monday to Sunday of that week
//             monthly = the whole month
//        c. PlatformReport.generateReport(range)   count the records created
//   3. the range and the counts go back and the page shows them
//
// Singapore is 8 hours ahead of UTC and the database stores UTC, so a day in
// Singapore starts at 16:00 UTC of the day before. That is the "- 8 hours" below.
// =============================================================================

const PlatformReport = require('../entity/PlatformReport');
const RequestError = require('./RequestError');

const DAY = 86400000; // one day in milliseconds
const SINGAPORE_OFFSET_MS = 8 * 3600000;

// Works out the start and end of the report. The end is not included.
function reportPeriod(period, date) {
  if (!['daily', 'weekly', 'monthly'].includes(period) || typeof date !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) {
    throw new RequestError(400, 'Choose a report period and valid date.');
  }

  // The date must be a real calendar day. Reading it back catches 2026-02-30.
  const calendar = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== date
    || calendar.getUTCFullYear() < 1900 || calendar.getUTCFullYear() > 9998) {
    throw new RequestError(400, 'Choose a valid date.');
  }

  const start = new Date(calendar);
  let end;
  if (period === 'weekly') start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7)); // back to Monday
  if (period === 'monthly') {
    start.setUTCDate(1);
    end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
  } else {
    end = new Date(start.getTime() + (period === 'weekly' ? 7 : 1) * DAY);
  }

  return {
    period,
    date,
    timezone: 'Asia/Singapore',
    start: new Date(start.getTime() - SINGAPORE_OFFSET_MS).toISOString(),
    endExclusive: new Date(end.getTime() - SINGAPORE_OFFSET_MS).toISOString(),
  };
}

class GenerateReportC {
  // Receives: query = { period, date }
  // Returns:  { period, date, timezone, start, endExclusive, counts }
  async generateReport(query) {
    const range = reportPeriod(query.period, query.date);
    return { ...range, counts: await PlatformReport.generateReport(range) };
  }
}

module.exports = { GenerateReportC, reportPeriod };
