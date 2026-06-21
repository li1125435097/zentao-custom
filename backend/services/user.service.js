'use strict';

const { ZENTAO_DEFAULT_DEPT_ID, ZENTAO_DEFAULT_DEPT_NAME } = require('../config');
const { ZentaoAPI } = require('./zentao-api.service');
const { mapPosition } = require('./position-map.service');
const { generatePassword } = require('./password.service');
const { nameToAccount } = require('./pinyin.service');
const pendingUserService = require('./pending-user.service');
const { findUserGroupIds } = require('./zentao-web.service');

function normalizeGender(gender) {
  const value = String(gender || '').trim().toLowerCase();
  if (['男', 'm', 'male', '1'].includes(value)) return 'm';
  if (['女', 'f', 'female', '0'].includes(value)) return 'f';
  return 'm';
}

async function createUser({
  realname,
  position,
  gender,
  dept = ZENTAO_DEFAULT_DEPT_ID,
  accountOverride = null,
  baseUrl = null,
  token = null,
  password = null,
  group = null,
}) {
  const api = new ZentaoAPI({ baseUrl, token });
  const auth = await api.ensureToken();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  let account;
  try {
    account = accountOverride || nameToAccount(realname);
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      code: error.code,
    };
  }

  const { role, groupId: autoGroupId } = mapPosition(position);
  const genderCode = normalizeGender(gender);
  const pwd = password || generatePassword(12);
  const groupId = group ?? autoGroupId;

  await api.refreshGroupCache();

  const result = await api.createUser({
    account,
    realname: String(realname).trim(),
    dept,
    role,
    gender: genderCode,
    password: pwd,
    group: groupId,
  });

  if (!result.ok) {
    const errorText = JSON.stringify(result.error || '');
    if ([422, 500].includes(result.status) && errorText.includes('account')) {
      const existed = await api.getUserByAccount(account);
      if (existed.ok) {
        return {
          ok: false,
          error: `账号 ${account} 已存在 (id=${existed.data.id}, realname=${existed.data.realname})，未创建`,
          existed: existed.data,
        };
      }
    }

    return {
      ok: false,
      error: result.error,
      status: result.status,
    };
  }

  const data = result.data || {};
  const newUserId = data.id;

  return {
    ok: true,
    user: {
      id: newUserId,
      account: data.account,
      realname: data.realname,
      dept: data.dept,
      role: data.role,
      gender: data.gender,
      group: groupId,
    },
    password: pwd,
    loginUrl: api.baseUrl,
    deptId: dept,
    deptName: ZENTAO_DEFAULT_DEPT_NAME,
    position,
  };
}

async function listUsers({ limit = 20, page = 1, search = null, dept = null } = {}) {
  const api = new ZentaoAPI();
  const auth = await api.ensureToken();
  if (!auth.ok) {
    return { ok: false, error: auth.error, status: auth.status || 401 };
  }

  const fetchLimit = search ? 200 : limit;
  const fetchPage = search ? 1 : page;
  const result = await api.listUsers({ limit: fetchLimit, page: fetchPage, deptId: dept });
  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status };
  }

  const data = result.data || {};
  let users = data.users || [];

  if (search) {
    const keyword = search.toLowerCase();
    users = users.filter((user) => {
      const account = String(user.account || '').toLowerCase();
      const realname = String(user.realname || '').toLowerCase();
      return account.includes(keyword) || realname.includes(keyword);
    });

    return {
      ok: true,
      users,
      total: users.length,
      page: 1,
      limit: users.length,
    };
  }

  return {
    ok: true,
    users,
    total: data.total,
    page: data.page,
    limit: data.limit,
  };
}

async function resetUserPasswordByAccount(account) {
  const api = new ZentaoAPI();
  const auth = await api.ensureToken();
  if (!auth.ok) {
    return { ok: false, error: auth.error, status: auth.status || 401 };
  }

  const normalizedAccount = String(account || '').trim();
  if (!normalizedAccount) {
    return { ok: false, error: '无效的用户账号', status: 400 };
  }

  const userResult = await api.getUserByAccount(normalizedAccount);
  if (!userResult.ok) {
    return { ok: false, error: userResult.error, status: userResult.status };
  }

  return resetUserPassword(userResult.data.id);
}

async function resetUserPassword(userId) {
  const api = new ZentaoAPI();
  const auth = await api.ensureToken();
  if (!auth.ok) {
    return { ok: false, error: auth.error, status: auth.status || 401 };
  }

  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: '无效的用户 ID', status: 400 };
  }

  const userResult = await api.getUser(id);
  if (!userResult.ok) {
    return { ok: false, error: userResult.error, status: userResult.status };
  }

  const user = userResult.data || {};
  const account = user.account;
  const newPassword = generatePassword(12);

  await api.refreshGroupCache();
  let groupIds = findUserGroupIds(api, account);

  if (!groupIds.length) {
    const position = pendingUserService.findPositionByAccountOrRealname(account, user.realname);
    if (position) {
      groupIds = [mapPosition(position).groupId];
    } else {
      groupIds = [api.groupIdForRole(user.role || 'dev')];
    }
  }

  const passwordResult = await api.updateUser(id, { password: newPassword });
  if (!passwordResult.ok) {
    return { ok: false, error: passwordResult.error, status: passwordResult.status };
  }

  const { restoreUserGroups } = require('./zentao-web.service');
  const groupResult = await restoreUserGroups(api, account, groupIds);
  let warning = null;
  if (!groupResult.ok) {
    warning = `密码已重置，但权限组恢复失败: ${typeof groupResult.error === 'string' ? groupResult.error : JSON.stringify(groupResult.error)}`;
  }

  return {
    ok: true,
    account: user.account,
    realname: user.realname,
    password: newPassword,
    loginUrl: api.baseUrl,
    message: '密码已重置',
    warning,
  };
}

async function deleteUser(userId) {
  const api = new ZentaoAPI();
  const auth = await api.ensureToken();
  if (!auth.ok) {
    return { ok: false, error: auth.error, status: auth.status || 401 };
  }

  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: '无效的用户 ID', status: 400 };
  }

  const result = await api.deleteUser(id);
  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status };
  }

  return { ok: true, message: '用户已删除' };
}

module.exports = {
  createUser,
  listUsers,
  deleteUser,
  resetUserPassword,
  resetUserPasswordByAccount,
  normalizeGender,
};
