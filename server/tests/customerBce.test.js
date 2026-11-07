const request = require('supertest');
const app = require('../src/app');
const { featureSession } = require('./helpers/featureSession');
const { sequelize, Company, IDPCategory, InteriorDesignProject } = require('../src/entity');

beforeEach(async () => { await sequelize.sync({ force: true }); });
afterAll(async () => { await sequelize.close(); });

async function projectFixtures() {
  const designer = await featureSession('Interior Designer', 'bce-designer');
  const customer = await featureSession('Customer', 'bce-customer');
  const projects = await InteriorDesignProject.bulkCreate([
    { name: 'Zulu', status: 'current', propertyType: 'Apartment', designStyle: 'Modern', designerAccountId: designer.account.id, createdAt: new Date('2026-01-01') },
    { name: 'alpha 100%_', status: 'current', propertyType: 'House', designStyle: 'Classic', designerAccountId: designer.account.id, createdAt: new Date('2026-02-01') },
    { name: 'Past project', status: 'past', designerAccountId: designer.account.id, completionDate: '2026-03-01' },
  ]);
  return { designer, customer, projects };
}

test('ongoing browsing defaults to FIFO and supports date and alphabetical ordering', async () => {
  const { customer, projects } = await projectFixtures();
  const browse = await customer.client.get('/api/customer/idps');
  expect(browse.status).toBe(200);
  expect(browse.body.total).toBe(2);
  expect(browse.body.projects.map(project => project.id)).toEqual([projects[0].id, projects[1].id]);
  for (const sort of ['date', 'alphabetical']) {
    const result = await customer.client.get('/api/customer/idps').query({ sort });
    expect(result.status).toBe(200);
    expect(result.body.projects.map(project => project.id)).toEqual([projects[1].id, projects[0].id]);
  }
  expect((await customer.client.get('/api/customer/idps').query({ sort: 'unknown' })).status).toBe(400);
});

test('search prompts for criteria, matches literal text and combines saved-value filters', async () => {
  const { customer } = await projectFixtures();
  expect((await customer.client.get('/api/customer/idps').query({ keyword: ' ' })).status).toBe(400);
  const result = await customer.client.get('/api/customer/idps').query({ keyword: '%_', propertyType: 'House' });
  expect(result.status).toBe(200);
  expect(result.body.projects.map(project => project.name)).toEqual(['alpha 100%_']);
  const empty = await customer.client.get('/api/customer/idps').query({ keyword: '%_', propertyType: 'Apartment' });
  expect(empty.body.projects).toEqual([]);
  expect(empty.body.hasResults).toBe(false);
  const filters = await customer.client.get('/api/customer/idps/filters');
  expect(filters.body).toEqual({ propertyTypes: ['Apartment', 'House'], designStyles: ['Classic', 'Modern'] });
});

test('project details include category, public designer and company, and increment views', async () => {
  const { designer, customer, projects } = await projectFixtures();
  const category = await IDPCategory.create({ name: 'Residential' });
  await Company.create({ name: 'Design Studio', designerAccountId: designer.account.id });
  await projects[0].update({ categoryId: category.id });
  const timestamp = projects[0].updatedAt.toISOString();
  const result = await customer.client.post(`/api/customer/idps/${projects[0].id}/view`).send({});
  expect(result.status).toBe(200);
  expect(result.body).toMatchObject({ categoryName: 'Residential', designerName: 'bce-designer', companyName: 'Design Studio' });
  expect(JSON.stringify(result.body)).not.toMatch(/password|example\.com|storage_path/);
  await projects[0].reload();
  expect(projects[0].viewCount).toBe(1);
  expect(projects[0].updatedAt.toISOString()).toBe(timestamp);
  expect((await customer.client.post(`/api/customer/idps/${projects[2].id}/view`).send({})).status).toBe(404);
});

test('existing projects can have no category or company and authentication remains required', async () => {
  const { customer, projects } = await projectFixtures();
  const result = await customer.client.post(`/api/customer/idps/${projects[0].id}/view`).send({});
  expect(result.status).toBe(200);
  expect(result.body.categoryName).toBeNull();
  expect(result.body.companyName).toBeNull();
  expect((await request(app).get('/api/customer/idps')).status).toBe(401);
});

test('designers can assign a category and unrelated updates preserve that link', async () => {
  const { designer } = await projectFixtures();
  const category = await IDPCategory.create({ name: 'Residential' });
  const created = await designer.client.post('/api/designer/current-idps').send({ name: 'Categorised', categoryId: category.id });
  expect(created.status).toBe(201);
  const id = created.body.project.id;
  expect(created.body.project.categoryId).toBe(category.id);
  const updated = await designer.client.put(`/api/designer/current-idps/${id}`).send({ name: 'Renamed' });
  expect(updated.status).toBe(200);
  expect(updated.body.project.categoryId).toBe(category.id);
  const invalid = await designer.client.put(`/api/designer/current-idps/${id}`).send({ name: 'Invalid', categoryId: 99999 });
  expect(invalid.status).toBe(422);
  expect((await InteriorDesignProject.findByPk(id)).name).toBe('Renamed');
});
