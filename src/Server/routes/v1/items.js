﻿var errs = require('restify-errors');
var Router = require('restify-router').Router;
var querymen = require('querymen');

const router = new Router();

var auth = require('./auth');
var Item = require('../../models/item');
var Tag = require('../../models/tag');


router.use(auth.authenticate);


/**
 * @swagger
 * /items:
 *   get:
 *     tags:
 *       - items
 *     description: Returns all items
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: search
 *         description: Search in name and description
 *         in: query
 *         required: false
 *         type: string
 *       - name: skip
 *         description: Skips the number of records
 *         in: query
 *         required: false
 *         type: integer
 *       - name: limit
 *         description: Returns the number of records
 *         in: query
 *         required: false
 *         type: integer
 *       - name: sort
 *         description: Sorts records by key
 *         in: query
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: An array of item
 *         schema:
 *           $ref: '#/definitions/Item'
 *       400:
 *         description: Bad request error
 *     security:
 *       - Bearer: []
 */

var itemSchemaQuerymen = new querymen.Schema({
    search: {
        type: RegExp,
        paths: ['name', 'description'],
        bindTo: 'search'
    },
    skip: {
        type: Number,
        default: 0,
        min: 0,
        bindTo: 'cursor'
    }
}, {page: false});


router.get('/items', querymen.middleware(itemSchemaQuerymen), function (req, res, next) {
    var query = req.querymen;

    Item.find(query.search, query.select, query.cursor, function (err, items) {
        if (err)
            return next(new errs.BadRequestError(err.message));

        res.json(items);
    });

});


/**
 * @swagger
 * /items/{id}:
 *   get:
 *     tags:
 *       - items
 *     description: Returns a single item
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         description: Item's id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: A single item
 *         schema:
 *           $ref: '#/definitions/Item'
 *       400:
 *         description: Bad request error
 *       404:
 *         description: Not found error
 *     security:
 *       - Bearer: []
 */
router.get('/items/:item_id', function (req, res, next) {

    Item.findById(req.params.item_id, function (err, item) {
        if (err)
            return next(new errs.BadRequestError(err.message));

        if (!item)
            return next(new errs.NotFoundError('Item not found'));

        res.json(item);

    });

});


/**
 * @swagger
 * /items:
 *   post:
 *     tags:
 *       - items
 *     description: Creates a new item
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: name
 *         description: Item's name
 *         in: formData
 *         required: true
 *         type: string
 *       - name: description
 *         description: Item's description
 *         in: formData
 *         type: string
 *     responses:
 *       201:
 *         description: Successfully created
 *         schema:
 *           $ref: '#/definitions/Item'
 *       400:
 *         description: Bad request error
 *     security:
 *       - Bearer: []
 */
router.post('/items', function (req, res, next) {

    var item = new Item();
    item.name = req.body.name;
    item.description = req.body.description;

    item.save(function (err, item) {
        if (err)
            return next(new errs.BadRequestError(err.message));

        if (!item)
            return next(new errs.InternalError("Error saving item"));

        req.log.info('create item', item);
        res.json(201, item);
    });

});


/**
 * @swagger
 * /items/{id}:
 *   put:
 *     tags:
 *       - items
 *     description: Updates a single item
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         description: Item's id
 *         in: path
 *         required: true
 *         type: string
 *       - name: name
 *         description: Item's name
 *         in: formData
 *         required: true
 *         type: string
 *       - name: description
 *         description: Item's description
 *         in: formData
 *         type: string
 *       - name: amount
 *         description: Item's amount
 *         in: formData
 *         required: true
 *         type: integer
 *     responses:
 *       200:
 *         description: Successfully updated
 *         schema:
 *           $ref: '#/definitions/Item'
 *       400:
 *         description: Bad request error
 *       404:
 *         description: Not found error
 *     security:
 *       - Bearer: []
 */
router.put('/items/:item_id', function (req, res, next) {

    var item = {
        name: req.body.name,
        description: req.body.description,
        amount: req.body.amount
    };

    var opts = {new: true, runValidators: true};

    Item.findByIdAndUpdate(req.params.item_id, item, opts, function (err, item) {
        if (err)
            return next(new errs.BadRequestError(err.message));

        if (!item)
            return next(new errs.NotFoundError('Item not found'));

        req.log.info('update item', item);
        res.json(item);
    });

});


/**
 * @swagger
 * /items/{id}:
 *   delete:
 *     tags:
 *       - items
 *     description: Deletes a single item
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         description: Item's id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       204:
 *         description: Successfully deleted
 *       400:
 *         description: Bad request error
 *       404:
 *         description: Not found error
 *     security:
 *       - Bearer: []
 */
router.del('/items/:item_id', function (req, res, next) {

    Item.findByIdAndRemove(req.params.item_id, function (err, item) {
        if (err)
            return next(new errs.BadRequestError(err.message));

        if (!item)
            return next(new errs.NotFoundError('Item not found'));
        else {

            var tag = {
                type: 'unknown',
                $unset: {item: true}
            };

            Tag.update({item: item._id}, tag, {new: true}, function (err, tag) {
                if (err)
                    return next(new errs.InternalError(err.message));

                if (tag)
                    req.log.info('update tags', tag);
            });


            req.log.info('delete item', item);
            res.send(204);
        }
    });

});


module.exports = router;