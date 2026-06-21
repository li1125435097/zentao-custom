'use strict';

const userService = require('../services/user.service');
const pendingUserService = require('../services/pending-user.service');
const { POSITION_OPTIONS } = require('../services/position-map.service');

class UserController {
  async listPositions(ctx) {
    ctx.body = {
      ok: true,
      data: POSITION_OPTIONS,
    };
  }

  async list(ctx) {
    const query = ctx.query || {};
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const search = query.search ? String(query.search).trim() : null;

    const result = await userService.listUsers({ page, limit, search });

    if (!result.ok) {
      ctx.status = result.status || 422;
      ctx.body = result;
      return;
    }

    ctx.body = {
      ok: true,
      users: result.users,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  async resetPassword(ctx) {
    const result = await userService.resetUserPassword(ctx.params.id);

    if (!result.ok) {
      ctx.status = result.status || 422;
      ctx.body = result;
      return;
    }

    ctx.body = {
      ok: true,
      account: result.account,
      realname: result.realname,
      password: result.password,
      url: result.loginUrl,
      message: result.message,
      warning: result.warning || null,
    };
  }

  async remove(ctx) {
    const result = await userService.deleteUser(ctx.params.id);

    if (!result.ok) {
      ctx.status = result.status || 422;
      ctx.body = result;
      return;
    }

    ctx.body = {
      ok: true,
      message: result.message,
    };
  }

  async batchCreate(ctx) {
    const payload = ctx.request.body || {};
    const users = Array.isArray(payload.users) ? payload.users : [];

    if (!users.length) {
      ctx.status = 400;
      ctx.body = { ok: false, error: '请至少提交一条用户信息' };
      return;
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const item of users) {
      const realname = String(item.name || item.realname || '').trim();
      const position = String(item.position || '').trim();
      const gender = String(item.gender || '').trim();

      if (!realname || !position || !gender) {
        results.push({
          ok: false,
          realname: realname || '(未填写)',
          error: '请填写姓名、岗位、性别',
        });
        failCount += 1;
        continue;
      }

      const result = await userService.createUser({ realname, position, gender });

      if (!result.ok) {
        results.push({
          ok: false,
          realname,
          error: typeof result.error === 'string' ? result.error : JSON.stringify(result.error || result),
        });
        failCount += 1;
        continue;
      }

      const pendingPayload = {
        realname: result.user.realname,
        position: result.position,
        gender,
        account: result.user.account,
        password: result.password,
        url: result.loginUrl,
        deptName: result.deptName,
        warning: result.warning || null,
      };

      const pendingId = String(item.pendingId || '').trim();
      let pendingRecord;
      if (pendingId) {
        const updateResult = pendingUserService.updatePendingUserAfterCreate(pendingId, pendingPayload);
        if (!updateResult.ok) {
          results.push({
            ok: false,
            realname,
            error: typeof updateResult.error === 'string'
              ? updateResult.error
              : JSON.stringify(updateResult.error || updateResult),
          });
          failCount += 1;
          continue;
        }
        pendingRecord = updateResult.data;
      } else {
        pendingRecord = pendingUserService.addPendingUser(pendingPayload);
      }

      results.push({
        ok: true,
        realname: result.user.realname,
        account: result.user.account,
        password: result.password,
        url: result.loginUrl,
        position: result.position,
        deptName: result.deptName,
        warning: result.warning || null,
        pendingId: pendingRecord.id,
      });
      successCount += 1;
    }

    ctx.body = {
      ok: failCount === 0,
      successCount,
      failCount,
      total: users.length,
      results,
      message: failCount === 0
        ? `全部 ${successCount} 个账号创建成功`
        : `成功 ${successCount} 个，失败 ${failCount} 个`,
    };
  }

  async create(ctx) {
    const payload = ctx.request.body || {};
    const realname = String(payload.name || payload.realname || '').trim();
    const position = String(payload.position || '').trim();
    const gender = String(payload.gender || '').trim();

    if (!realname || !position || !gender) {
      ctx.status = 400;
      ctx.body = {
        ok: false,
        error: '请填写姓名、岗位、性别',
      };
      return;
    }

    const result = await userService.createUser({ realname, position, gender });

    if (!result.ok) {
      ctx.status = result.status || 422;
      ctx.body = result;
      return;
    }

    ctx.body = {
      ok: true,
      account: result.user.account,
      password: result.password,
      url: result.loginUrl,
      realname: result.user.realname,
      position: result.position,
      deptName: result.deptName,
      role: result.user.role,
      group: result.user.group,
      warning: result.warning || null,
      message: '账号创建成功，请首次登录后立即修改密码。',
    };
  }
}

module.exports = new UserController();
