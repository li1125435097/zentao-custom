'use strict';

const Router = require('@koa/router');
const tokenController = require('../controllers/token.controller');

const router = new Router({ prefix: '/tokens' });

router.get('/', (ctx) => tokenController.list(ctx));
router.post('/', (ctx) => tokenController.create(ctx));
router.patch('/:id/status', (ctx) => tokenController.updateStatus(ctx));

module.exports = router;
