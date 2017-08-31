const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const { Router, IndexMap } = require('../router.js');
const { Store } = require('db-plumbing-map')


class TestObject { 
    constructor(uid, a,b) { this.uid = uid; this.a = a; this.b = b} 
    static fromJSON({uid,a,b}) { return new TestObject(uid,a,b); } 
}

function byA(value, item) { return item.a === value; }

let store = new Store(TestObject);

const app = express();
app.use(morgan('combined'));
app.use(bodyParser.json())
app.use(new Router(store, new IndexMap().mapKey(parseInt).mapParameters(byA, res=>res.query.a)).routes())

let server;

function start() {
    const port = process.env.PORT || 8666;
    return new Promise((resolve, reject) => {
        server = app.listen(port, () => {
            console.log(`Your app is listening on port ${port}`);
            resolve();
    })
        .on('error', err => {
            reject(err);
    });
});
}


function stop() {
    return new Promise((resolve, reject) => {
        console.log('Closing server');
        server.close(err => {
            if (err) {
                reject(err);
                // so we don't also call `resolve()`
                return;
        }
        resolve();
    });
});
}

module.exports = {app, start, stop, TestObject, byA };