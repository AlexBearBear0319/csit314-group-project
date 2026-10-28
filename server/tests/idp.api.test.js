const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const { sequelize, UserProfile, UserAccount, InteriorDesignProject } = require('../src/entity');
const { setStorageAdapterForTests } = require('../src/storage/IdpImageStorage');
const { resetRateLimitsForTests } = require('../src/middleware/rateLimit');

const ORIGIN = 'http://localhost:5173';

let designerOne;
let designerTwo;
let customer;

async function startSession(username) {
  const client = request.agent(app);
  const response = await client
    .post('/api/login')
    .set('Origin', ORIGIN)
    .send({ username, password: 'password123' });
  return { client, csrfToken: response.body.csrfToken, account: response.body.account, response };
}

function withCsrf(session, method, path, body) {
  let req = session.client[method](`/api${path}`).set('Origin', ORIGIN);
  if (session.csrfToken) req = req.set('X-CSRF-Token', session.csrfToken);
  if (body !== undefined) req = req.send(body);
  return req;
}

async function makeProject(session, status, values = {}) {
  const response = await withCsrf(session, 'post', `/designer/${status}-idps`, {
    name: `${status} project`,
    propertyType: 'Apartment',
    designStyle: 'Modern',
    ...values,
  });
  expect(response.status).toBe(201);
  return response.body.project;
}

beforeEach(async () => {
  resetRateLimitsForTests();
  setStorageAdapterForTests(null);
  await sequelize.sync({ force: true });

  const [designerProfile, customerProfile] = await Promise.all([
    UserProfile.create({ name: 'Interior Designer' }),
    UserProfile.create({ name: 'Customer' }),
  ]);
  const password = await bcrypt.hash('password123', 4);
  [designerOne, designerTwo, customer] = await Promise.all([
    UserAccount.create({ username: 'designer-one', password, name: 'Designer One', email: 'one@example.com', profileId: designerProfile.id }),
    UserAccount.create({ username: 'designer-two', password, name: 'Designer Two', email: 'two@example.com', profileId: designerProfile.id }),
    UserAccount.create({ username: 'customer-one', password, name: 'Customer One', email: 'customer@example.com', profileId: customerProfile.id }),
  ]);
});

afterAll(async () => {
  setStorageAdapterForTests(null);
  await sequelize.close();
});

describe('Interior Designer IDP use cases #20-29', () => {
  test('requires a server session and rejects a non-designer role', async () => {
    await request(app).get('/api/designer/current-idps').expect(401);

    const session = await startSession('customer-one', 'Customer');
    expect(session.response.status).toBe(200);
    expect(session.account.role).toBe('Customer');
    const currentSession = await session.client.get('/api/session').expect(200);
    expect(currentSession.body.account.id).toBe(customer.id);
    await session.client.get('/api/designer/current-idps').expect(403);
    await withCsrf(session, 'post', '/designer/current-idps', { name: 'Injected' }).expect(403);
  });

  test('current IDP #20-24: create, view, update, search and delete', async () => {
    const session = await startSession('designer-one', 'Interior Designer');
    expect(session.response.status).toBe(200);

    const project = await makeProject(session, 'current', {
      name: 'Garden Apartment',
      description: 'Light wood and plants',
    });

    const list = await session.client.get('/api/designer/current-idps').expect(200);
    expect(list.body.projects).toHaveLength(1);
    expect(list.body.projects[0].id).toBe(project.id);

    const view = await session.client.get(`/api/designer/current-idps/${project.id}`).expect(200);
    expect(view.body.project.name).toBe('Garden Apartment');

    const update = await withCsrf(session, 'put', `/designer/current-idps/${project.id}`, {
      name: 'Garden Home',
      description: 'A calm home with plants',
      propertyType: 'Condominium',
      designStyle: 'Japandi',
    }).expect(200);
    expect(update.body.project.name).toBe('Garden Home');

    const search = await session.client.get('/api/designer/current-idps?q=japandi').expect(200);
    expect(search.body.projects.map((item) => item.id)).toContain(project.id);

    const remove = await withCsrf(session, 'delete', `/designer/current-idps/${project.id}`).expect(200);
    expect(remove.body.deleted).toBe(true);
    await session.client.get(`/api/designer/current-idps/${project.id}`).expect(404);
  });

  test('past IDP #25-29: requires a completion date and searches by that date', async () => {
    const session = await startSession('designer-one', 'Interior Designer');
    const missingDate = await withCsrf(session, 'post', '/designer/past-idps', {
      name: 'Finished flat',
      propertyType: 'Apartment',
      designStyle: 'Modern',
    });
    expect(missingDate.status).toBe(422);
    expect(missingDate.body.errors.completionDate).toBeTruthy();

    const invalidDate = await withCsrf(session, 'post', '/designer/past-idps', {
      name: 'Invalid date project',
      completionDate: '2025-02-30',
    });
    expect(invalidDate.status).toBe(422);
    expect(invalidDate.body.errors.completionDate).toBeTruthy();

    const project = await makeProject(session, 'past', { name: 'Finished flat', completionDate: '2025-04-12' });
    const list = await session.client.get('/api/designer/past-idps').expect(200);
    expect(list.body.projects[0].completionDate).toBe('2025-04-12');

    const view = await session.client.get(`/api/designer/past-idps/${project.id}`).expect(200);
    expect(view.body.project.completionDate).toBe('2025-04-12');

    const update = await withCsrf(session, 'put', `/designer/past-idps/${project.id}`, {
      name: 'Finished home',
      description: '',
      propertyType: 'Townhouse',
      designStyle: 'Minimal',
      completionDate: '2025-05-01',
    }).expect(200);
    expect(update.body.project.completionDate).toBe('2025-05-01');

    const search = await session.client.get('/api/designer/past-idps?q=2025-05-01').expect(200);
    expect(search.body.projects.map((item) => item.id)).toContain(project.id);

    await withCsrf(session, 'delete', `/designer/past-idps/${project.id}`).expect(200);
  });

  test('keeps current and past results separate', async () => {
    const session = await startSession('designer-one', 'Interior Designer');
    await makeProject(session, 'current', { name: 'Shared name' });
    await makeProject(session, 'past', { name: 'Shared name', completionDate: '2024-02-01' });

    const current = await session.client.get('/api/designer/current-idps?q=Shared').expect(200);
    const past = await session.client.get('/api/designer/past-idps?q=Shared').expect(200);
    expect(current.body.projects).toHaveLength(1);
    expect(current.body.projects[0].status).toBe('current');
    expect(past.body.projects).toHaveLength(1);
    expect(past.body.projects[0].status).toBe('past');
  });

  test('paginates current projects in stable groups of nine and validates page values', async () => {
    const session = await startSession('designer-one', 'Interior Designer');
    const list = (page = 1) => session.client.get(`/api/designer/current-idps?page=${page}&pageSize=9`);

    let response = await list(1).expect(200);
    expect(response.body.projects).toHaveLength(0);
    expect(response.body.pagination).toEqual({ page: 1, pageSize: 9, total: 0, totalPages: 0 });

    const addProjects = async (from, to) => {
      for (let number = from; number <= to; number += 1) {
        await InteriorDesignProject.createOwned({
          name: `Pagination project ${number}`,
          description: null,
          propertyType: 'Apartment',
          designStyle: 'Modern',
          status: 'current',
          completionDate: null,
          designerAccountId: designerOne.id,
        });
      }
    };

    await addProjects(1, 1);
    response = await list(1).expect(200);
    expect(response.body.projects).toHaveLength(1);
    expect(response.body.pagination).toMatchObject({ total: 1, totalPages: 1 });

    await addProjects(2, 9);
    response = await list(1).expect(200);
    expect(response.body.projects).toHaveLength(9);
    expect(response.body.pagination).toMatchObject({ total: 9, totalPages: 1 });
    const firstPageIds = response.body.projects.map((project) => project.id);
    expect((await list(1)).body.projects.map((project) => project.id)).toEqual(firstPageIds);

    await addProjects(10, 10);
    const tenthProjectPage = await list(2).expect(200);
    expect(tenthProjectPage.body.projects).toHaveLength(1);
    expect(tenthProjectPage.body.pagination).toMatchObject({ page: 2, total: 10, totalPages: 2 });

    await addProjects(11, 18);
    const eighteenthProjectPage = await list(2).expect(200);
    expect(eighteenthProjectPage.body.projects).toHaveLength(9);
    expect(eighteenthProjectPage.body.pagination).toMatchObject({ total: 18, totalPages: 2 });

    await addProjects(19, 19);
    const secondPage = await list(2).expect(200);
    const thirdPage = await list(3).expect(200);
    const finalFirstPage = await list(1).expect(200);
    expect(secondPage.body.projects).toHaveLength(9);
    expect(thirdPage.body.projects).toHaveLength(1);
    expect(thirdPage.body.pagination).toMatchObject({ page: 3, total: 19, totalPages: 3 });
    expect(new Set([...finalFirstPage.body.projects.map((project) => project.id), ...secondPage.body.projects.map((project) => project.id), ...thirdPage.body.projects.map((project) => project.id)]).size).toBe(19);

    await session.client.get('/api/designer/current-idps?page=0').expect(422);
    await session.client.get('/api/designer/current-idps?page=1.5').expect(422);
    await session.client.get('/api/designer/current-idps?page=abc').expect(422);
    await session.client.get('/api/designer/current-idps?pageSize=10').expect(422);

    await withCsrf(session, 'delete', `/designer/current-idps/${thirdPage.body.projects[0].id}`).expect(200);
    const afterLastPageDelete = await list(3).expect(200);
    expect(afterLastPageDelete.body.projects).toHaveLength(0);
    expect(afterLastPageDelete.body.pagination).toMatchObject({ page: 3, total: 18, totalPages: 2 });
  });

  test('does not let one designer read, edit, delete or upload to another designer project', async () => {
    const owner = await startSession('designer-one', 'Interior Designer');
    const other = await startSession('designer-two', 'Interior Designer');
    const project = await makeProject(owner, 'current', { name: 'Private project' });

    await other.client.get(`/api/designer/current-idps/${project.id}`).expect(404);
    await withCsrf(other, 'put', `/designer/current-idps/${project.id}`, { name: 'Stolen' }).expect(404);
    await withCsrf(other, 'delete', `/designer/current-idps/${project.id}`).expect(404);
    await withCsrf(other, 'post', `/designer/current-idps/${project.id}/images/upload-url`, {
      fileName: 'photo.png',
      contentType: 'image/png',
      sizeBytes: 256,
    }).expect(404);

    const ownerView = await owner.client.get(`/api/designer/current-idps/${project.id}`).expect(200);
    expect(ownerView.body.project.name).toBe('Private project');
  });

  test('requires a CSRF token for writes and revokes the session on logout', async () => {
    const session = await startSession('designer-one', 'Interior Designer');
    await session.client.post('/api/designer/current-idps').set('Origin', ORIGIN).send({ name: 'No token' }).expect(403);

    await withCsrf(session, 'delete', '/session').expect(200);
    await session.client.get('/api/session').expect(401);
  });

  test('uploads images through scoped intents and records metadata after storage confirms the file', async () => {
    const storage = {
      createSignedUploadUrl: jest.fn(async (path) => ({ token: 'signed-upload-token', path })),
      verifyObject: jest.fn(async () => ({ contentType: 'image/png', sizeBytes: 128 })),
      createSignedReadUrl: jest.fn(async (path) => `https://storage.example/${path}?signed=read`),
      removeObjects: jest.fn(async (paths) => ({ removed: paths, failed: [] })),
    };
    setStorageAdapterForTests(storage);

    const session = await startSession('designer-one', 'Interior Designer');
    const project = await makeProject(session, 'current', { name: 'Image project' });
    const intent = await withCsrf(session, 'post', `/designer/current-idps/${project.id}/images/upload-url`, {
      fileName: 'living-room.png',
      contentType: 'image/png',
      sizeBytes: 128,
      altText: 'Living room with a wood floor',
    }).expect(201);

    expect(intent.body.upload.path).toContain(`${designerOne.id}/${project.id}/`);
    const completed = await withCsrf(session, 'post', `/designer/current-idps/${project.id}/images/${intent.body.upload.id}/complete`, {}).expect(201);
    expect(completed.body.image.altText).toBe('Living room with a wood floor');
    expect(completed.body.image.url).toContain('signed=read');

    const view = await session.client.get(`/api/designer/current-idps/${project.id}`).expect(200);
    expect(view.body.project.images).toHaveLength(1);
    expect(storage.verifyObject).toHaveBeenCalledWith(intent.body.upload.path);

    await withCsrf(session, 'delete', `/designer/current-idps/${project.id}/images/${completed.body.image.id}`).expect(200);
    expect(storage.removeObjects).toHaveBeenCalledWith([intent.body.upload.path]);
  });

  test('cancels an unused image upload link and removes its temporary object', async () => {
    const storage = {
      createSignedUploadUrl: jest.fn(async (path) => ({ token: 'signed-upload-token', path })),
      verifyObject: jest.fn(),
      createSignedReadUrl: jest.fn(),
      removeObjects: jest.fn(async (paths) => ({ removed: paths, failed: [] })),
    };
    setStorageAdapterForTests(storage);

    const session = await startSession('designer-one', 'Interior Designer');
    const project = await makeProject(session, 'current');
    const intent = await withCsrf(session, 'post', `/designer/current-idps/${project.id}/images/upload-url`, {
      fileName: 'draft.png',
      contentType: 'image/png',
      sizeBytes: 128,
    }).expect(201);

    await withCsrf(session, 'delete', `/designer/current-idps/${project.id}/images/uploads/${intent.body.upload.id}`).expect(200);
    await withCsrf(session, 'post', `/designer/current-idps/${project.id}/images/${intent.body.upload.id}/complete`, {}).expect(404);
    expect(storage.removeObjects).toHaveBeenCalledWith([intent.body.upload.path]);
  });

  test('clears expired or invalid image objects through a retryable cleanup record', async () => {
    const storage = {
      createSignedUploadUrl: jest.fn(async (path) => ({ token: 'signed-upload-token', path })),
      verifyObject: jest.fn(async () => ({ contentType: 'image/png', sizeBytes: 128 })),
      createSignedReadUrl: jest.fn(async (path) => `https://storage.example/${path}`),
      removeObjects: jest.fn(async () => ({ removed: [], failed: ['designer/1/orphan.png'] })),
    };
    setStorageAdapterForTests(storage);

    const session = await startSession('designer-one', 'Interior Designer');
    const project = await makeProject(session, 'current');
    const intent = await withCsrf(session, 'post', `/designer/current-idps/${project.id}/images/upload-url`, {
      fileName: 'photo.png',
      contentType: 'image/png',
      sizeBytes: 128,
    }).expect(201);
    storage.verifyObject.mockRejectedValueOnce(new Error('Image type does not match.'));

    const complete = await withCsrf(session, 'post', `/designer/current-idps/${project.id}/images/${intent.body.upload.id}/complete`, {});
    expect(complete.status).toBe(422);
    expect(storage.removeObjects).toHaveBeenCalledWith([intent.body.upload.path]);
  });
});
