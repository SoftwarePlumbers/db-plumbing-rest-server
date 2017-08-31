# ![Software Plumbers](http://docs.softwareplumbers.com/common/img/SquareIdent-160.png) DB Plumbing (REST Server)

REST interface to db-plumbing-map or db-plumbing-mongo document stores.

## Tl;DR

```javascript
const app=express()

let store = new Store(Object, object=>object.key);

app.use(new Router(store).routes())

```

and the following methods of store will be exposed as service endpoints:

| Route             | HTTP   |  method   |
|-------------------|--------|-----------|
| /findAll/:index   | GET    | findAll   |
| /removeAll/:index | GET    | removeAll |
| /items/:uid       | GET    | find      |
| /items/:uid       | PUT    | update    |
| /items/:uid       | DELETE | remove    |
| /bulk             | POST   | bulk      |


The store supports remove, find by criteria, and remove by criteria operations. It also supports a bulked update operation based on the [typed-patch](https://npmjs.org/packages/typed-patch) library.

This implementation is intended to exppose data provided by db-plumbing-mongo or db-plumbing-map.

For the latest API documentation see [The Software Plumbers Site](http://docs.softwareplumbers.com/db-plumbing-rest-server/master)
