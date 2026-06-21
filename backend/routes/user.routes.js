'use strict';

const Router = require('@koa/router');
const userController = require('../controllers/user.controller');

const router = new Router({ prefix: '/users' });

router.get('/positions', (ctx) => userController.listPositions(ctx));
router.get('/', (ctx) => userController.list(ctx));
router.post('/register', (ctx) => userController.create(ctx));
router.post('/batch-register', (ctx) => userController.batchCreate(ctx));
router.put('/:id/password', (ctx) => userController.resetPassword(ctx));
router.delete('/:id', (ctx) => userController.remove(ctx));

module.exports = router;
