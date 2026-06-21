'use strict';

async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = {
      ok: false,
      error: error.message || '服务器内部错误',
    };
    console.error('[error]', error);
  }
}

module.exports = { errorHandler };
