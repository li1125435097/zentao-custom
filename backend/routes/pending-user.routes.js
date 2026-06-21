'use strict';

const Router = require('@koa/router');
const pendingUserController = require('../controllers/pending-user.controller');

const router = new Router({ prefix: '/pending-users' });

router.get('/', (ctx) => pendingUserController.list(ctx));
router.post('/apply', (ctx) => pendingUserController.apply(ctx));
router.post('/fetch', (ctx) => pendingUserController.fetchByName(ctx));
router.post('/reapply-request', (ctx) => pendingUserController.requestReApply(ctx));
router.post('/:id/process-reapply', (ctx) => pendingUserController.processReApply(ctx));

module.exports = router;
