
const request = require('supertest');
const app = require('../src/app');
const { sequelize, Company, InteriorDesignProject, UserAccount } = require('../src/entity');
const { featureSession } = require('./helpers/featureSession');
beforeEach(async () => { await sequelize.sync({ force: true }); });
afterAll(async () => { await sequelize.close(); });
test('company CRUD and literal search use only the session owner', async () => {
 const { client, account } = await featureSession('Interior Designer','owner');
 const { client: other, account: otherAccount } = await featureSession('Interior Designer','other');
 const created = await client.post('/api/companies').send({ name: ' Studio 100%_ ', description: ' Calm ', designerAccountId: otherAccount.id });
 expect(created.status).toBe(201);
 expect(created.body).toMatchObject({ name:'Studio 100%_', description:'Calm', designerAccountId:account.id });
 expect((await client.post('/api/companies').send({name:'Second'})).status).toBe(409);
 expect((await other.get('/api/companies/mine')).status).toBe(404);
 expect((await other.get('/api/companies')).body).toEqual([]);
 expect((await client.get('/api/companies').query({keyword:'%_'})).body).toHaveLength(1);
 expect((await client.get('/api/companies').query({keyword:'missing'})).body).toEqual([]);
 expect((await client.put('/api/companies/mine').send({name:'Updated',description:'New'})).status).toBe(200);
 expect((await client.get('/api/companies/mine')).body.name).toBe('Updated');
 expect((await other.delete('/api/companies/mine')).status).toBe(404);
 expect((await client.delete('/api/companies/mine')).status).toBe(200);
 expect(await Company.count()).toBe(0);
});
test('company validation preserves saved data; role and CSRF checks protect writes', async () => {
 const {client,agent} = await featureSession('Interior Designer');
 expect((await client.post('/api/companies').send({name:'Original'})).status).toBe(201);
 for(const body of [{name:''},{name:4},{name:'x'.repeat(256)},{name:'Valid',description:{}}]) {
  expect((await client.put('/api/companies/mine').send(body)).status).toBe(400);
 }
 expect((await client.get('/api/companies/mine')).body.name).toBe('Original');
 expect((await agent.delete('/api/companies/mine').set('Origin','http://localhost:5173')).status).toBe(403);
 expect((await client.get('/api/companies').query({keyword:['x','y']})).status).toBe(400);
 const {client: customer} = await featureSession('Customer','customer');
 expect((await customer.get('/api/companies')).status).toBe(403);
 expect((await request(app).get('/api/companies')).status).toBe(401);
});
test('customer browse paginates, searches literal text, and counts only successful detail opens', async () => {
 const {account} = await featureSession('Interior Designer','designer');
 const {client} = await featureSession('Customer','customer');
 const projects = await InteriorDesignProject.bulkCreate(Array.from({length:11},(_,i)=>({name:i===0?'Modern 100%_':'Project '+i, status:'current',designerAccountId:account.id})));
 let res = await client.get('/api/customer/idps');
 expect(res.status).toBe(200); expect(res.body.total).toBe(11); expect(res.body.projects).toHaveLength(9); expect(res.body.totalPages).toBe(2);
 res = await client.get('/api/customer/idps').query({keyword:'%_'});
 expect(res.body.projects).toHaveLength(1); expect(res.body.projects[0].name).toBe('Modern 100%_');
 expect(JSON.stringify(res.body)).not.toContain('password');
 expect((await client.get('/api/customer/idps').query({page:2})).body.projects).toHaveLength(2);
 expect((await client.get('/api/customer/idps').query({page:'abc'})).status).toBe(400);
 expect((await client.post('/api/customer/idps/'+projects[0].id+'/view').send({})).status).toBe(200);
 await client.post('/api/customer/idps/'+projects[0].id+'/view').send({});
 expect((await projects[0].reload()).viewCount).toBe(2);
 expect((await client.post('/api/customer/idps/99999/view').send({})).status).toBe(404);
 expect((await client.post('/api/customer/idps/abc/view').send({})).status).toBe(400);
 await UserAccount.update({status:'suspended'},{where:{id:account.id}});
 expect((await client.get('/api/customer/idps')).body.total).toBe(0);
 expect((await client.post('/api/customer/idps/'+projects[0].id+'/view').send({})).status).toBe(404);
});
test('customer view writes require CSRF and customer role', async () => {
 const {client,agent} = await featureSession('Customer');
 expect((await agent.post('/api/customer/idps/1/view').set('Origin','http://localhost:5173').send({})).status).toBe(403);
 expect((await client.get('/api/reports').query({period:'daily',date:'2026-10-30'})).status).toBe(403);
 const {client: designer} = await featureSession('Interior Designer','designer');
 expect((await designer.get('/api/customer/idps')).status).toBe(403);
});
test('daily reports count records created inside Singapore calendar bounds only', async () => {
 const {client} = await featureSession('Platform Manager','manager');
 const {account} = await featureSession('Interior Designer','designer');
 await Company.create({name:'Before',designerAccountId:account.id,createdAt:new Date('2026-10-29T15:59:59Z')});
 await InteriorDesignProject.bulkCreate([
  {name:'Start',status:'current',designerAccountId:account.id,createdAt:new Date('2026-10-29T16:00:00Z')},
  {name:'Last',status:'past',designerAccountId:account.id,createdAt:new Date('2026-10-30T15:59:59Z')},
  {name:'Next',status:'current',designerAccountId:account.id,createdAt:new Date('2026-10-30T16:00:00Z')},
 ]);
 const res = await client.get('/api/reports').query({period:'daily',date:'2026-10-30'});
 expect(res.status).toBe(200);
 expect(res.body).toMatchObject({timezone:'Asia/Singapore',start:'2026-10-29T16:00:00.000Z',endExclusive:'2026-10-30T16:00:00.000Z'});
 expect(res.body.counts).toMatchObject({companies:0,projects:2,currentProjects:1,pastProjects:1});
});
test('weekly and monthly report boundaries handle year crossover and leap February', async () => {
 const {client} = await featureSession('Platform Manager');
 let res = await client.get('/api/reports').query({period:'weekly',date:'2026-01-01'});
 expect(res.body.start).toBe('2025-12-28T16:00:00.000Z');
 expect(res.body.endExclusive).toBe('2026-01-04T16:00:00.000Z');
 res = await client.get('/api/reports').query({period:'monthly',date:'2028-02-01'});
 expect(res.body.start).toBe('2028-01-31T16:00:00.000Z');
 expect(res.body.endExclusive).toBe('2028-02-29T16:00:00.000Z');
 expect(res.body.counts.projects).toBe(0);
 for(const query of [{period:'yearly',date:'2026-01-01'},{period:'daily',date:'2026-02-30'},{period:'daily',date:'bad'},{}]) {
  expect((await client.get('/api/reports').query(query)).status).toBe(400);
 }
});
