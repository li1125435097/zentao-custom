'use strict';

const pendingUserService = require('../services/pending-user.service');
const userService = require('../services/user.service');

class PendingUserController {
  async list(ctx) {
    ctx.body = {
      ok: true,
      data: pendingUserService.listPendingUsers(),
    };
  }

  async apply(ctx) {
    const payload = ctx.request.body || {};
    const realname = String(payload.name || payload.realname || '').trim();
    const position = String(payload.position || '').trim();
    const gender = String(payload.gender || '').trim();

    const result = pendingUserService.addApplyRequest({ realname, position, gender });

    if (!result.ok) {
      ctx.status = result.status || 422;
      ctx.body = result;
      return;
    }

    ctx.body = {
      ok: true,
      message: '账号申请已提交，请告知管理员李金科处理',
      data: result.data,
    };
  }

  async fetchByName(ctx) {
    const payload = ctx.request.body || {};
    const realname = payload.name || payload.realname;
    const result = pendingUserService.fetchPendingUserByName(realname);

    if (!result.ok) {
      ctx.status = result.status || 422;
      ctx.body = result;
      return;
    }

    ctx.body = {
      ok: true,
      ...result.data,
    };
  }

  async requestReApply(ctx) {
    const payload = ctx.request.body || {};
    const realname = payload.name || payload.realname;
    const result = pendingUserService.requestReApplyByName(realname);

    if (!result.ok) {
      ctx.status = result.status || 422;
      ctx.body = result;
      return;
    }

    ctx.body = {
      ok: true,
      message: '已提交重新获取申请，请等待管理员处理',
      data: result.data,
    };
  }

  async processReApply(ctx) {
    const { id } = ctx.params;
    const found = pendingUserService.findPendingUserById(id);

    if (!found.ok) {
      ctx.status = found.status || 404;
      ctx.body = found;
      return;
    }

    const pendingUser = found.user;
    if (!pendingUser.reApply) {
      ctx.status = 400;
      ctx.body = { ok: false, error: '该记录未申请重新获取' };
      return;
    }

    const resetResult = await userService.resetUserPasswordByAccount(pendingUser.account);
    if (!resetResult.ok) {
      ctx.status = resetResult.status || 422;
      ctx.body = resetResult;
      return;
    }

    const updateResult = pendingUserService.markPendingUserUnfetched(id, {
      password: resetResult.password,
    });
    if (!updateResult.ok) {
      ctx.status = updateResult.status || 422;
      ctx.body = updateResult;
      return;
    }

    ctx.body = {
      ok: true,
      message: '密码已重置，用户可重新获取账号信息',
      account: resetResult.account,
      realname: resetResult.realname,
      password: resetResult.password,
      warning: resetResult.warning || null,
      data: updateResult.data,
    };
  }
}

module.exports = new PendingUserController();
