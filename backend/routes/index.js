'use strict';

const Router = require('@koa/router');
const healthRoutes = require('./health.routes');
const userRoutes = require('./user.routes');
const pendingUserRoutes = require('./pending-user.routes');
const tokenRoutes = require('./token.routes');

const router = new Router({ prefix: '/api' });

router.use(healthRoutes.routes(), healthRoutes.allowedMethods());
router.use(userRoutes.routes(), userRoutes.allowedMethods());
router.use(pendingUserRoutes.routes(), pendingUserRoutes.allowedMethods());
router.use(tokenRoutes.routes(), tokenRoutes.allowedMethods());

module.exports = router;
