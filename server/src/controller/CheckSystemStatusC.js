// =============================================================================
// CONTROLLER: CheckSystemStatusC          (BCE: Controller layer)
// Not a user story. Backs GET /api/health/ready, which we use after each
// deployment to see if the system is ready:
//   1. DatabaseStatus.check()      database reachable? tables and columns there?
//   2. checkStorageReady()         is the image storage bucket set up properly?
//   3. combine both into "ready" or "not_ready"
// =============================================================================

const DatabaseStatus = require('../entity/DatabaseStatus');
const { checkStorageReady } = require('../storage/IdpImageStorage');

class CheckSystemStatusC {
  // Returns { ready, body } where body is what the route sends back.
  async checkReady() {
    const { database, schema, schemaIssues } = await DatabaseStatus.check();
    const checks = { api: 'ok', database, schema, storage: 'unavailable' };

    try {
      checks.storage = (await checkStorageReady()) ? 'ok' : 'not_configured';
    } catch {
      checks.storage = 'unavailable';
    }

    const ready = checks.database === 'ok' && checks.schema === 'ok' && checks.storage === 'ok';
    return { ready, body: { status: ready ? 'ready' : 'not_ready', checks, schemaIssues } };
  }
}

module.exports = CheckSystemStatusC;
