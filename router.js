const { Patch } = require('typed-patch');
const { Store } = require('db-plumbing-map');
const debug = require('debug')('db-plumbing-rest-server');

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
    constructor(store, index_map) {
        this.store=store;
        this.index_map=index_map;
    }

    findAll(req, res) {
        let index_data = this.index_map[req.params.index];
        if (index_data) 
            this.store.findAll(index_data.index, index_data.param_map(req))
                .then( result => res.json( { ok: true, result } ) )
                .catch( err  => { console.warn(err); res.status(500).send(err.toString());} );
        else
            res.status(404).send('unknown index: ' + req.params.index);
    }

    find(req, res) {
        let uid = req.params.uid;
        if (uid)
            this.store.find(uid)
                .then( result => res.json( { ok: true, result } ) )
                .catch( err => {
                    if (err instanceof Store.DoesNotExist)
                        res.status(404).send(`${uid} not found`);
                    else
                        res.status(500).send(err.toString());
                });
        else
            res.status(500).send('Bad uid');
    }

    bulk(req,res) {
        try {
            let body = req.body;
            let patch = Patch.fromJSON(body);
            debug('bulk', patch);
            this.store.bulk(patch)
                .then(update => res.status(200).send(update))
                .catch(err => {
                    console.log.warn('bulk',err);
                    res.status(500).send(err.toString());
                });
        } catch(err) {
            console.log.warning('bulk',err);
            res.status(500).send(err.toString());
        }

    } 

    update(req,res) {
        let body = req.body;
        debug(body);
        let object = this.store.type.fromJSON(body);
        if (object) {
            this.store.update(object)
                .then( () => res.sendStatus(200) )
                .catch( err => res.status(500).send(err.toString()));
        } else {
            res.status(500).send('Bad object data');   
        } 
    }

    remove(req, res) {
        let uid = req.params.uid;
        this.store.remove(uid)
            .then( () => res.sendStatus(200))
            .catch( err  => { console.warn(err); res.status(500).send(err.toString()); } );        
    }

    removeAll(req,res) {
        let index_data = this.index_map[req.params.index];
        if (index_data) 
            this.store.removeAll(index_data.index, index_data.param_map(req))
                .then( () => res.sendStatus(200) )
                .catch( err  => { console.warn(err); res.status(500).send(err.toString()); } );
        else
            res.status(404).send('unknown index: ' + req.params.index);
    }

    /** Set up appropriate routes for each operation */
    route(router) {
        router.get(   '/findAll/:index',  (req,res) => this.findAll(req,res));
        router.delete('/removeAll/:index',(req,res) => this.removeAll(req,res));
        router.get(   '/items/:uid',      (req,res) => this.find(req,res));
        router.put(   '/items/:uid',      (req,res) => this.update(req,res));
        router.delete('/items/:uid',      (req,res) => this.remove(req,res));
        router.post(  '/bulk',            (req,res) => this.bulk(req,res));
    }
}


module.exports = {Router,IndexMap};
