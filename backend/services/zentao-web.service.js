'use strict';

const { request } = require('./http-client.service');

function normalizeAccount(account) {
  return String(account || '').trim().replace(/["'\s]/g, '');
}

function isValidAccount(account) {
  const value = normalizeAccount(account);
  return /^[a-zA-Z0-9_]+$/.test(value);
}

function findUserGroupIds(api, account) {
  if (!api.groupCache) {
    throw new Error('权限组缓存未初始化');
  }

  const userAccount = normalizeAccount(account);
  if (!userAccount) return [];

  return api.groupCache.groups
    .filter((group) => {
      const accounts = group.accounts || {};
      return Object.keys(accounts).some((name) => normalizeAccount(name) === userAccount);
    })
    .map((group) => group.id);
}

async function createWebSession(baseUrl, _apiToken = null, { requireWrite = false } = {}) {
  const account = process.env.ZENTAO_ADMIN_ACCOUNT || 'medisyn';
  const password = process.env.ZENTAO_ADMIN_PASSWORD;
  if (!password) {
    return { ok: false, error: '未配置 ZENTAO_ADMIN_PASSWORD', status: 401 };
  }

  const { ZentaoAPI } = require('./zentao-api.service');
  const loginApi = new ZentaoAPI({ baseUrl, token: null });
  const tokenResult = await loginApi.login(account, password);
  if (!tokenResult.ok || !loginApi.token) {
    return {
      ok: false,
      error: 'ZENTAO_ADMIN_PASSWORD 验证失败，无法恢复用户权限。请确认密码与禅道管理员账号一致。',
      status: 401,
    };
  }

  const sessionId = loginApi.token;
  const cookie = `zentaosid=${sessionId}`;
  const headers = { Cookie: cookie, Token: sessionId };

  if (requireWrite) {
    const check = await request(
      `${baseUrl}/index.php?m=group&f=browse&t=json&zentaosid=${sessionId}`,
      { method: 'GET', headers, timeout: 30000 },
    );
    if (!check.ok || check.data?.status === 'failed') {
      return { ok: false, error: '禅道 Web 会话不可用', status: 401 };
    }
  }

  return { ok: true, sessionId, cookie, headers, authMode: 'rest-session' };
}

async function saveGroupMembers(baseUrl, sessionId, groupId, members, requestHeaders) {
  const uniqueMembers = [...new Set(members.filter(Boolean))];
  if (!uniqueMembers.length) {
    return { ok: false, status: 422, error: '权限组成员列表为空' };
  }

  const body = uniqueMembers
    .map((member) => `members[]=${encodeURIComponent(member)}`)
    .join('&');

  const urls = [
    `${baseUrl}/index.php?m=group&f=manageMember&groupID=${groupId}&t=json&zentaosid=${sessionId}`,
    `${baseUrl}/group-manageMember-${groupId}.json?zentaosid=${sessionId}`,
  ];

  let lastResult = null;
  for (const url of urls) {
    lastResult = await request(url, {
      method: 'POST',
      headers: {
        ...requestHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body,
      timeout: 30000,
    });
    if (lastResult.ok && lastResult.data?.result !== 'fail') {
      return lastResult;
    }
  }

  return lastResult || { ok: false, status: 422, error: '权限组成员保存失败' };
}

async function resetPasswordViaWebEdit(api, userId, user, newPassword, groupIds) {
  const session = await createWebSession(api.baseUrl, api.token, { requireWrite: true });
  if (!session.ok) {
    return session;
  }

  const visions = user.visions;
  const visionValues = Array.isArray(visions) ? visions : [visions || 'rnd'];
  const params = new URLSearchParams();
  params.append('account', user.account || '');
  params.append('realname', user.realname || '');
  params.append('dept', String(user.dept ?? 1));
  params.append('role', user.role || 'dev');
  params.append('gender', user.gender || 'm');
  params.append('type', user.type || 'inside');
  params.append('password1', newPassword);
  params.append('password2', newPassword);
  groupIds.forEach((groupId) => params.append('groups[]', String(groupId)));
  visionValues.filter(Boolean).forEach((vision) => params.append('visions[]', vision));

  const url = `${api.baseUrl}/index.php?m=user&f=edit&userID=${userId}&t=json&zentaosid=${session.sessionId}`;
  const result = await request(url, {
    method: 'POST',
    headers: {
      ...session.headers,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: params.toString(),
    timeout: 30000,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status || 422 };
  }

  if (result.data?.result === 'fail' || result.data?.status === 'failed') {
    return {
      ok: false,
      error: result.data.message || result.data.reason || result.data,
      status: 422,
    };
  }

  return { ok: true };
}

async function restoreUserGroups(api, account, groupIds) {
  const cleanAccount = normalizeAccount(account);
  if (!isValidAccount(cleanAccount)) {
    return { ok: false, error: `无效的用户账号: ${account}`, status: 422 };
  }

  const session = await createWebSession(api.baseUrl, api.token, { requireWrite: true });
  if (!session.ok) {
    return session;
  }

  const failures = [];
  for (const groupId of groupIds) {
    await api.refreshGroupCache();
    const group = api.groupCache.groups.find((item) => item.id === groupId);
    const members = [...new Set(
      Object.keys(group?.accounts || {})
        .map(normalizeAccount)
        .filter(isValidAccount),
    )];
    if (!members.includes(cleanAccount)) {
      members.push(cleanAccount);
    }

    const result = await saveGroupMembers(
      api.baseUrl,
      session.sessionId,
      groupId,
      members,
      session.headers,
    );
    if (!result.ok) {
      failures.push({ groupId, error: result.error || result.status });
    }
  }

  await api.refreshGroupCache();
  const restoredGroupIds = findUserGroupIds(api, cleanAccount);
  const missingGroupIds = groupIds.filter((groupId) => !restoredGroupIds.includes(groupId));

  if (missingGroupIds.length) {
    return {
      ok: false,
      status: 422,
      error: `权限组恢复不完整，未恢复: ${missingGroupIds.join(', ')}`,
      failures,
    };
  }

  if (failures.length) {
    return {
      ok: false,
      status: 422,
      error: failures.map((item) => `group=${item.groupId}: ${JSON.stringify(item.error)}`).join('; '),
      failures,
    };
  }

  return { ok: true };
}

module.exports = {
  findUserGroupIds,
  createWebSession,
  saveGroupMembers,
  resetPasswordViaWebEdit,
  restoreUserGroups,
};
