'use strict';

const tokenService = require('../services/token.service');

class TokenController {
  async list(ctx) {
    ctx.body = {
      ok: true,
      data: tokenService.listTokens(),
    };
  }

  async create(ctx) {
    const payload = ctx.request.body || {};
    const realname = payload.name || payload.realname;
    const result = tokenService.addToken({ realname });

    if (!result.ok) {
      ctx.status = result.status || 422;
      ctx.body = result;
      return;
    }

    ctx.body = {
      ok: true,
      message: 'Token 创建成功',
      data: result.data,
    };
  }

  async updateStatus(ctx) {
    const { id } = ctx.params;
    const payload = ctx.request.body || {};
    const result = tokenService.updateTokenStatus(id, payload.status);

    if (!result.ok) {
      ctx.status = result.status || 422;
      ctx.body = result;
      return;
    }

    ctx.body = {
      ok: true,
      message: result.data.status === 'enabled' ? 'Token 已启用' : 'Token 已停用',
      data: result.data,
    };
  }
}

module.exports = new TokenController();
