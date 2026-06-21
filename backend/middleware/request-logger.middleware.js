'use strict';

const { logApiRequest, logApiResponse, sanitize } = require('../services/api-logger.service');

async function requestLogger(ctx, next) {
  const startedAt = Date.now();
  const isApi = ctx.path.startsWith('/api/');

  if (isApi) {
    logApiRequest({
      method: ctx.method,
      url: ctx.path,
      headers: ctx.headers,
      body: ctx.request.body,
    });
  }

  await next();

  if (isApi) {
    logApiResponse({
      method: ctx.method,
      url: ctx.path,
      status: ctx.status,
      ok: ctx.status < 400,
      data: sanitize(ctx.body),
      error: ctx.status >= 400 ? sanitize(ctx.body) : undefined,
      durationMs: Date.now() - startedAt,
    });
  }
}

module.exports = { requestLogger };
