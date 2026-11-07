// =============================================================================
// TESTS: idpStats.test.js
// Interior Designer stories #30 (view IDP view count) and #31 (view IDP
// shortlist count). Written BEFORE the code (TDD): run first to see red.
//
//   npx jest tests/idpStats.test.js
//
// Uses the temporary in-memory database, never the real Supabase one.
// =============================================================================

const { sequelize, UserAccount, UserProfile, InteriorDesignProject, ShortlistItem } = require('../src/entity');
const { featureSession } = require('./helpers/featureSession');

let designer;
let otherDesigner;
let customerOne;
let customerTwo;
let currentIdp;
let pastIdp;

beforeEach(async () => {
  await sequelize.sync({ force: true });
  designer = await featureSession('Interior Designer', 'designer.one');
  otherDesigner = await featureSession('Interior Designer', 'designer.two');
  customerOne = await featureSession('Customer', 'customer.one');
  customerTwo = await featureSession('Customer', 'customer.two');
  currentIdp = await InteriorDesignProject.create({ name: 'Warm Kitchen', status: 'current', designerAccountId: designer.account.id });
  pastIdp = await InteriorDesignProject.create({ name: 'Old Flat', status: 'past', completionDate: '2025-01-10', designerAccountId: designer.account.id });
});

afterAll(async () => { await sequelize.close(); });

describe('#30 View IDP view count', () => {
  test('a new IDP has been viewed 0 times', async () => {
    const res = await designer.client.get(`/api/designer/idps/${currentIdp.id}/view-count`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ projectId: currentIdp.id, viewCount: 0 });
  });

  test('each customer view adds 1, for current and past IDPs', async () => {
    await customerOne.client.post(`/api/customer/idps/${currentIdp.id}/view`).expect(200);
    await customerTwo.client.post(`/api/customer/idps/${currentIdp.id}/view`).expect(200);
    await customerOne.client.post(`/api/customer/idps/${pastIdp.id}/view`).expect(200);
    const current = await designer.client.get(`/api/designer/idps/${currentIdp.id}/view-count`).expect(200);
    const past = await designer.client.get(`/api/designer/idps/${pastIdp.id}/view-count`).expect(200);
    expect(current.body.viewCount).toBe(2);
    expect(past.body.viewCount).toBe(1);
  });

  test('reading the count does not change it or the project', async () => {
    await designer.client.get(`/api/designer/idps/${currentIdp.id}/view-count`).expect(200);
    await designer.client.get(`/api/designer/idps/${currentIdp.id}/view-count`).expect(200);
    const after = await InteriorDesignProject.findByPk(currentIdp.id);
    expect(after.viewCount).toBe(0);
    expect(after.name).toBe('Warm Kitchen');
  });

  test('another designer cannot read it (404), unknown id gives 404, bad id gives 400', async () => {
    await otherDesigner.client.get(`/api/designer/idps/${currentIdp.id}/view-count`).expect(404);
    await designer.client.get('/api/designer/idps/99999/view-count').expect(404);
    await designer.client.get('/api/designer/idps/abc/view-count').expect(400);
  });

  test('needs a login and the Interior Designer role', async () => {
    const request = require('supertest');
    const app = require('../src/app');
    await request(app).get(`/api/designer/idps/${currentIdp.id}/view-count`).expect(401);
    await customerOne.client.get(`/api/designer/idps/${currentIdp.id}/view-count`).expect(403);
  });
});

describe('#31 View IDP shortlist count', () => {
  test('a new IDP has been shortlisted 0 times', async () => {
    const res = await designer.client.get(`/api/designer/idps/${currentIdp.id}/shortlist-count`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ projectId: currentIdp.id, shortlistCount: 0 });
  });

  test('counts each customer who saved it, once per customer', async () => {
    await customerOne.client.post('/api/customer/shortlist').send({ projectId: currentIdp.id }).expect(201);
    await customerOne.client.post('/api/customer/shortlist').send({ projectId: currentIdp.id }).expect(409);
    await customerTwo.client.post('/api/customer/shortlist').send({ projectId: currentIdp.id }).expect(201);
    await customerTwo.client.post('/api/customer/shortlist').send({ projectId: pastIdp.id }).expect(201);
    const current = await designer.client.get(`/api/designer/idps/${currentIdp.id}/shortlist-count`).expect(200);
    const past = await designer.client.get(`/api/designer/idps/${pastIdp.id}/shortlist-count`).expect(200);
    expect(current.body.shortlistCount).toBe(2);
    expect(past.body.shortlistCount).toBe(1);
  });

  test('the count falls when a shortlist row is removed, and reading does not change shortlists', async () => {
    await customerOne.client.post('/api/customer/shortlist').send({ projectId: currentIdp.id }).expect(201);
    await designer.client.get(`/api/designer/idps/${currentIdp.id}/shortlist-count`).expect(200);
    expect(await ShortlistItem.count()).toBe(1);
    await ShortlistItem.destroy({ where: { projectId: currentIdp.id } });
    const res = await designer.client.get(`/api/designer/idps/${currentIdp.id}/shortlist-count`).expect(200);
    expect(res.body.shortlistCount).toBe(0);
  });

  test('another designer cannot read it (404), unknown id 404, bad id 400', async () => {
    await otherDesigner.client.get(`/api/designer/idps/${currentIdp.id}/shortlist-count`).expect(404);
    await designer.client.get('/api/designer/idps/99999/shortlist-count').expect(404);
    await designer.client.get('/api/designer/idps/abc/shortlist-count').expect(400);
  });

  test('needs a login and the Interior Designer role', async () => {
    const request = require('supertest');
    const app = require('../src/app');
    await request(app).get(`/api/designer/idps/${currentIdp.id}/shortlist-count`).expect(401);
    await customerOne.client.get(`/api/designer/idps/${currentIdp.id}/shortlist-count`).expect(403);
  });
});

describe('IDP list shows both counts', () => {
  test('the designer list and detail include viewCount and shortlistCount', async () => {
    await customerOne.client.post(`/api/customer/idps/${currentIdp.id}/view`).expect(200);
    await customerOne.client.post('/api/customer/shortlist').send({ projectId: currentIdp.id }).expect(201);
    const list = await designer.client.get('/api/designer/current-idps').expect(200);
    expect(list.body.projects[0]).toMatchObject({ viewCount: 1, shortlistCount: 1 });
    const view = await designer.client.get(`/api/designer/current-idps/${currentIdp.id}`).expect(200);
    expect(view.body.project).toMatchObject({ viewCount: 1, shortlistCount: 1 });
    const past = await designer.client.get('/api/designer/past-idps').expect(200);
    expect(past.body.projects[0]).toMatchObject({ viewCount: 0, shortlistCount: 0 });
  });
});
