let index = require('../index.js');
let chai = require('chai');
let chaiHttp = require('chai-http');
const { describe } = require('mocha');

chai.should();
chai.use(chaiHttp);

describe('Index', () => {
    describe('GET /', () => {
        it('should return 200 OK', (done) => {
            chai.request(index)
                .get('/')
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
                });
        });
    });
});