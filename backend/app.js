'use strict';

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const { HOST, PORT, FRONTEND_DIR, MANAGER_TOKEN } = require('./config');
const routes = require('./routes');
const { errorHandler } = require('./middleware/error.middleware');
const { requestLogger } = require('./middleware/request-logger.middleware');
const tokenService = require('./services/token.service');

const SESSION_TTL_MS = 30 * 60 * 1000;
const ROLES = Object.freeze({ SUPER: 'super', ADMIN: 'admin', GUEST: 'guest' });

/** @type {Map<string, { role: string, expiresAt: number }>} */
const clientSessions = new Map();

const PUBLIC_API_PATHS = new Set(['/api/login', '/api/session', '/api/health']);

const GUEST_PAGE_PATHS = new Set([
  '/pages/internal/apply-account.html',
  '/pages/internal/fetch-user.html',
]);

const PERMISSION_PAGE_PATHS = new Set([
  '/pages/permissions/token-list.html',
]);

const GUEST_API_PATHS = new Set([
  '/api/pending-users/apply',
  '/api/pending-users/fetch',
  '/api/pending-users/reapply-request',
]);

function getClientIp(ctx) {
  const forwarded = ctx.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return ctx.ip || ctx.request.ip;
}

function resolveRole(token) {
  const value = String(token || '').trim();
  if (!value) {
    return ROLES.GUEST;
  }
  if (MANAGER_TOKEN && value === MANAGER_TOKEN) {
    return ROLES.SUPER;
  }
  const matched = tokenService.listTokens().some(
    (item) => item.token === value && item.status === 'enabled',
  );
  if (matched) {
    return ROLES.ADMIN;
  }
  return ROLES.GUEST;
}

function getSession(ip) {
  const session = clientSessions.get(ip);
  if (!session) {
    return null;
  }
  if (Date.now() > session.expiresAt) {
    clientSessions.delete(ip);
    return null;
  }
  return session;
}

function setSession(ip, role) {
  clientSessions.set(ip, {
    role,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}

function getEffectiveRole(ctx) {
  const session = getSession(getClientIp(ctx));
  return session ? session.role : ROLES.GUEST;
}

function canAccessPage(role, pagePath) {
  if (role === ROLES.SUPER) {
    return true;
  }
  if (role === ROLES.ADMIN) {
    return !PERMISSION_PAGE_PATHS.has(pagePath);
  }
  return GUEST_PAGE_PATHS.has(pagePath);
}

function canAccessApi(role, apiPath) {
  if (PUBLIC_API_PATHS.has(apiPath)) {
    return true;
  }
  if (role === ROLES.SUPER) {
    return true;
  }
  if (role === ROLES.ADMIN) {
    return !apiPath.startsWith('/api/tokens');
  }
  return GUEST_API_PATHS.has(apiPath);
}

function getDefaultPage(role) {
  return role === ROLES.GUEST
    ? '/pages/internal/apply-account.html'
    : '/pages/users/create.html';
}

async function authMiddleware(ctx, next) {
  const ip = getClientIp(ctx);

  if (ctx.path === '/api/login') {
    const role = resolveRole(ctx.query.token);
    setSession(ip, role);
    ctx.body = { ok: true, role };
    if(role !== ROLES.GUEST) ctx.redirect('/pages/users/create.html');
    return;
  }

  if (ctx.path === '/api/session') {
    ctx.body = { ok: true, role: getEffectiveRole(ctx) };
    return;
  }

  if (ctx.path.startsWith('/assets/')) {
    await next();
    return;
  }

  if (ctx.path.startsWith('/api/')) {
    if (!canAccessApi(getEffectiveRole(ctx), ctx.path)) {
      ctx.status = 403;
      ctx.body = { ok: false, error: '无权访问' };
      return;
    }
    await next();
    return;
  }

  if (ctx.path === '/') {
    ctx.redirect(getDefaultPage(getEffectiveRole(ctx)));
    return;
  }

  if (ctx.path.startsWith('/pages/') && !canAccessPage(getEffectiveRole(ctx), ctx.path)) {
    ctx.redirect(getDefaultPage(getEffectiveRole(ctx)));
    return;
  }

  await next();
}

const app = new Koa();

app.use(errorHandler);
app.use(bodyParser());
app.use(requestLogger);
app.use(authMiddleware);
app.use(routes.routes(), routes.allowedMethods());

app.use(serve(FRONTEND_DIR, {
  index: false,
  defer: false,
}));

app.use(async (ctx) => {
  if (!ctx.path.startsWith('/api/') && ctx.status === 404) {
    ctx.redirect(getDefaultPage(getEffectiveRole(ctx)));
  }
});

app.listen(PORT, HOST, () => {
  const hostLabel = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`禅道管理服务已启动: http://${hostLabel}:${PORT}`);
  console.log(`前端页面: http://${hostLabel}:${PORT}/pages/users/create.html`);
});

module.exports = app;
