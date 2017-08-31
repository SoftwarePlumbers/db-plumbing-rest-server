const chai = require('chai');
const chaiHttp = require('chai-http');
const { Patch, Operations } = require('typed-patch');
const { app, start, stop, TestObject, byA } = require('./server');
const debug = require('debug')('db-plumbing-rest-server');

const expect= chai.expect;

chai.use(chaiHttp);

describe('Restful DB API server', () => {

	before(function() {
    	return start();
  	});

  	after(function() {
    	return stop();
  	});

    it('should write and read back a simple object', (done) => {
        chai.request(app)
                .put('/items/34')
                .set('content-type', 'application/json')
                .send({uid:34, a:2, b:3})
            .then(res => { expect(res).to.have.status(204); })
            .then(() => chai.request(app).get('/items/34'))
            .then(res => {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
            })
            .then(()=>done(), done);
    });

    it('creates multiple objects in store and finds by index', (done) => {

        chai.request(app)
                .put('/items/1')
                .set('content-type', 'application/json')
                .send({uid:1, a:'hello', b:'world'})
            .then(res => { expect(res).to.have.status(204); })
            .then(() => chai.request(app)
                .put('/items/2')
                .set('content-type', 'application/json')
                .send({uid:2, a:'hello', b:'friend'}))
            .then(res => { expect(res).to.have.status(204); })
            .then(() => chai.request(app)
                .put('/items/3')
                .set('content-type', 'application/json')
                .send({uid:3, a:'goodbye', b:'Mr. Chips'}))
            .then(res => { expect(res).to.have.status(204); })
            .then(() => chai.request(app)
                .get('/findAll/byA?&a=hello'))
            .then(res=> {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body.length).to.equal(2);
                })
            .then(()=>done(), done);
 
    });

    it('can do bulk update in store', (done) => {

        chai.request(app)
                .put('/items/1')
                .set('content-type', 'application/json')
                .send({uid:1, a:'hello', b:'world'})
            .then(res => { expect(res).to.have.status(204); })
            .then(() => chai.request(app)
                .put('/items/2')
                .set('content-type', 'application/json')
                .send({uid:2, a:'hello', b:'friend'}))
            .then(res => { expect(res).to.have.status(204); })
            .then(() => chai.request(app)
                .put('/items/3')
                .set('content-type', 'application/json')
                .send({uid:3, a:'goodbye', b:'Mr. Chips'}))
            .then(res => { expect(res).to.have.status(204); })
            .then(() => chai.request(app)
                .post('/bulk')
                .set('content-type', 'application/json')
                .send(new Operations.Map([ [1, new Operations.Mrg( { b: new Operations.Rpl('pizza') } ) ]]).toJSON()))
            .then(() => chai.request(app).get('/items/1'))
            .then(res => {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body.b).to.equal('pizza');
                })
            .then(()=>done(), done);
        }
    );
});