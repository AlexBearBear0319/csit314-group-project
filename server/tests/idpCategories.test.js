const request = require('supertest');
const { DataTypes } = require('sequelize');
const app = require('../src/app');
const { sequelize, IDPCategory } = require('../src/entity');

// A test-only consumer verifies the foreign-key contract for Alex's IDP model.
const CategoryReference = sequelize.define('CategoryReferenceTest', {
  categoryId: { type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'idp_category', key: 'id' }, onDelete: 'RESTRICT' },
});

beforeEach(async () => { await sequelize.sync({ force: true }); });
afterAll(async () => { await sequelize.close(); });

describe('IDP category stories #39–43', () => {
  test('creates and views a category, trimming only editable fields', async () => {
    const created = await request(app).post('/api/idp-categories')
      .send({ name: ' Modern ', description: ' Clean lines ', id: 999, status: 'suspended' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Modern', description: 'Clean lines' });
    expect(created.body.id).not.toBe(999);
    expect(created.body).not.toHaveProperty('status');
    const viewed = await request(app).get(`/api/idp-categories/${created.body.id}`);
    expect(viewed.status).toBe(200);
    expect(viewed.body).toEqual(created.body);
  });

  test.each([{}, { name: ' ' }, { name: 7 }, { name: 'x'.repeat(256) },
    { name: 'Modern', description: {} }, { name: 'Modern', description: 'x'.repeat(256) }])
  ('rejects invalid category input %j', async (body) => {
    const res = await request(app).post('/api/idp-categories').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBeTruthy();
    expect(res.body.errors).toBeTruthy();
    expect(await IDPCategory.count()).toBe(0);
  });

  test('allows an empty optional description and reports duplicate names', async () => {
    expect((await request(app).post('/api/idp-categories').send({ name: 'Modern' })).status).toBe(201);
    const duplicate = await request(app).post('/api/idp-categories').send({ name: ' Modern ' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.errors.name).toBeTruthy();
    expect(await IDPCategory.count()).toBe(1);
  });

  test('updates a category without changing its ID or breaking project references', async () => {
    const category = await IDPCategory.create({ name: 'Modern' });
    const reference = await CategoryReference.create({ categoryId: category.id });
    const res = await request(app).put(`/api/idp-categories/${category.id}`)
      .send({ name: 'Contemporary', description: 'Updated', id: 999 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: category.id, name: 'Contemporary', description: 'Updated' });
    expect((await reference.reload()).categoryId).toBe(category.id);
  });

  test('failed updates preserve the existing category', async () => {
    const category = await IDPCategory.create({ name: 'Modern', description: 'Original' });
    await IDPCategory.create({ name: 'Contemporary' });
    expect((await request(app).put(`/api/idp-categories/${category.id}`).send({ name: '' })).status).toBe(400);
    expect((await request(app).put(`/api/idp-categories/${category.id}`).send({ name: 'Contemporary' })).status).toBe(409);
    await category.reload();
    expect(category.name).toBe('Modern');
    expect(category.description).toBe('Original');
  });

  test('deletes an unused category and returns 404 when it no longer exists', async () => {
    const category = await IDPCategory.create({ name: 'Modern' });
    const res = await request(app).delete(`/api/idp-categories/${category.id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('IDP category deleted.');
    expect(await IDPCategory.findByPk(category.id)).toBeNull();
    expect((await request(app).get(`/api/idp-categories/${category.id}`)).status).toBe(404);
    expect((await request(app).delete(`/api/idp-categories/${category.id}`)).status).toBe(404);
  });

  test('a database reference prevents deleting a category and preserves linked data', async () => {
    const category = await IDPCategory.create({ name: 'Modern' });
    await CategoryReference.create({ categoryId: category.id });
    const res = await request(app).delete(`/api/idp-categories/${category.id}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('in use');
    expect(await IDPCategory.count()).toBe(1);
    expect(await CategoryReference.count()).toBe(1);
  });

  test.each(['0', '-1', 'abc', '1.5', '2147483648', '9007199254740992'])
  ('rejects invalid IDs: %s', async (id) => {
    expect((await request(app).get(`/api/idp-categories/${id}`)).status).toBe(400);
    expect((await request(app).put(`/api/idp-categories/${id}`).send({ name: 'Modern' })).status).toBe(400);
    expect((await request(app).delete(`/api/idp-categories/${id}`)).status).toBe(400);
  });

  test('reports a missing category on view and update', async () => {
    expect((await request(app).get('/api/idp-categories/9999')).status).toBe(404);
    expect((await request(app).put('/api/idp-categories/9999').send({ name: 'Modern' })).status).toBe(404);
  });

  test('searches 100 records by name and description with literal case-insensitive keywords', async () => {
    await IDPCategory.bulkCreate(Array.from({ length: 100 }, (_, i) => ({
      name: `Category ${String(i).padStart(3, '0')}`, description: i === 50 ? 'Modern 100%_test' : '',
    })));
    expect((await request(app).get('/api/idp-categories')).body).toHaveLength(100);
    for (const keyword of ['  MODERN  ', '%_', 'Category 050']) {
      const res = await request(app).get('/api/idp-categories').query({ keyword });
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Category 050');
    }
    expect((await request(app).get('/api/idp-categories').query({ keyword: "' OR 1=1 --" })).body).toEqual([]);
    expect((await request(app).get('/api/idp-categories?keyword=a&keyword=b')).status).toBe(400);
  });
});
