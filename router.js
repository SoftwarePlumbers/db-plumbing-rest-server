const Patch = require('typed-patch');
const { Store, DoesNotExist } = require('db-plumbing-map');
const debug = require('debug')('db-plumbing-rest-server');
const express = require('express');

/** Configure formats in which indexes and keys are parsed from incoming requests
*/
class IndexMap {

    /** Map an index filter function to a function that can extract suitable parameters from a request 
    *
    * @param index {Function} a named function (value,item)=>boolean that can filter items in the store
    * @param param_map {Function) a function req=>value that can extract filter parameters from a request
    * @returns this index map (for fluent construction)
    */
    mapParameters(index, param_map) {
        this[index.name] = { index, param_map };
        return this;
    }

    /** Specify function to parse key values from a request string.
    *
    * @param param_map key to convert strings to key values.
    */
    mapKey(param_map) {
        this._key = param_map;
        return this;
    }

    constructor() {
        this._key = e => e;
    }
}

/** Maps a Store to a number of API endpoints using an express router.
 *
 */
class Router {

    /** Construct a router
    *
    *
    * @param store A document store used to back this service
    * @param index {IndexMap} maps index filter function name (used in stores) to a function which extracts filter values from a request.
    */
    constructor(store, index_map = new IndexMap()) {
        this.store=store;
        this.index_map=index_map;
    }

    /** Find records by index.
    *
    * @param req request including index name and query parameters
    * @param res response json array including results
    */
    findAll(req, res) {
        let index_data = this.index_map[req.params.index];
        if (index_data) 
            this.store.findAll(index_data.index, index_data.param_map(req))
                .then( result => res.json( result ))
                .catch( err  => { console.warn(err); res.status(500).send(err.toString());} );
        else
            res.status(404).send('unknown index: ' + req.params.index);
    }

    /** find a individual record
    *
    * @param req request including unique record id
    * @parma res response
    */
    find(req, res) {
        let uid = this.index_map._key(req.params.uid);
        debug('find', typeof uid, uid);
        //debug(this.store.idMap);
        if (uid)
            this.store.find(uid)
                .then( result => res.json( result ) )
                .catch( err => {
                    if (err instanceof DoesNotExist)
                        res.status(404).send(`${uid} not found`);
                    else
                        res.status(500).send(err.toString());
                });
        else
            res.status(500).send('Bad uid');
    }

    /** Execute a bulk update.
    *
    * @oaram req request including a JSON body in typed-patch format
    * @param res response
    */
    bulk(req,res) {
        try {
            let body = req.body;
            debug('bulk', body);
            let patch = Patch.fromJSON(body);
            debug('bulk', patch);
            this.store.bulk(patch)
                .then(update => res.status(200).json({ count: update }))
                .catch(err => {
                    console.warn('bulk',err);
                    res.status(500).send(err.toString());
                });
        } catch(err) {
            console.warn('bulk',err);
            res.status(500).send(err.toString());
        }

    } 

    /** Update or insert an individual record.
    *
    * @oaram req request including a JSON body
    * @param res response
    */
    update(req,res) {
        let body = req.body;
        debug('update',body);
        let object = this.store.type.fromJSON(body);
        if (object) {
            this.store.update(object)
                .then( (result) => res.sendStatus(204) )
                .catch( err => res.status(500).send(err.toString()));
        } else {
            res.status(500).send('Bad object data');   
        } 
    }

    /** Remove an individual record.
    *
    * @oaram req request including the unique record id
    * @param res response status 200 if executed successfully
    */
    remove(req, res) {
        let uid = this.index_map._key(req.params.uid);
        this.store.remove(uid)
            .then( () => res.sendStatus(204))
            .catch( err  => { console.warn(err); res.status(500).send(err.toString()); } );        
    }

    /** Remove records by index.
    *
    * @param req request including index name and query parameters
    * @param res response status 200 if executed successfully
    */
    removeAll(req,res) {
        let index_data = this.index_map[req.params.index];
        if (index_data) 
            this.store.removeAll(index_data.index, index_data.param_map(req))
                .then( () => res.sendStatus(204) )
                .catch( err  => { console.warn(err); res.status(500).send(err.toString()); } );
        else
            res.status(404).send('unknown index: ' + req.params.index);
    }

    /** Set up appropriate routes for each operation.
    *
    *  | Route             | HTTP   |  method   |
    *  |-------------------|--------|-----------|
    *  | /findAll/:index   | GET    | findAll   |
    *  | /removeAll/:index | GET    | removeAll |
    *  | /items/:uid       | GET    | find      |
    *  | /items/:uid       | PUT    | update    |
    *  | /items/:uid       | DELETE | remove    |
    *  | /bulk             | POST   | bulk      |
    *
    * @return an express router.
    */
    routes() {
        let router = express.Router();
        router.get(   '/findAll/:index',  (req,res) => this.findAll(req,res));
        router.delete('/removeAll/:index',(req,res) => this.removeAll(req,res));
        router.get(   '/items/:uid',      (req,res) => this.find(req,res));
        router.put(   '/items/:uid',      (req,res) => this.update(req,res));
        router.delete('/items/:uid',      (req,res) => this.remove(req,res));
        router.post(  '/bulk',            (req,res) => this.bulk(req,res));
        return router;
    }
}


module.exports = {Router,IndexMap};
