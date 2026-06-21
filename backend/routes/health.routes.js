'use strict';

const Router = require('@koa/router');
const healthController = require('../controllers/health.controller');

const router = new Router();

router.get('/health', (ctx) => healthController.check(ctx));

module.exports = router;
