'use strict';

const { request } = require('./http-client.service');

class ZentaoAPI {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.ZENTAO_BASE_URL || 'https://mdsteam.medisyn.cc:1857').replace(/\/$/, '');
    this.token = options.token || process.env.ZENTAO_API_TOKEN || null;
    this.timeout = options.timeout || 30000;
    this.groupCache = null;
  }

  apiUrl(path, version = 'v1') {
    return `${this.baseUrl}/api.php/${version}${path}`;
  }

  headers(includeToken = true) {
    const h = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (includeToken && this.token) {
      h.Token = this.token;
    }
    return h;
  }

  formatGroupForCreate(group) {
    if (group == null) return undefined;
    if (Array.isArray(group)) {
      return group.map(String).join(',');
    }
    return String(group);
  }

  normalizeGroupIds(group) {
    if (group == null) return [];
    const values = Array.isArray(group) ? group : [group];
    return values
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0);
  }

  async login(account, password) {
    const result = await request(this.apiUrl('/tokens'), {
      method: 'POST',
      headers: this.headers(false),
      body: { account, password },
      timeout: this.timeout,
    });

    if (result.ok && result.data && result.data.token) {
      this.token = result.data.token;
    }

    return result;
  }

  async ensureToken() {
    if (this.token) return { ok: true, data: { token: this.token } };

    const account = process.env.ZENTAO_ADMIN_ACCOUNT || 'medisyn';
    const password = process.env.ZENTAO_ADMIN_PASSWORD;
    if (!password) {
      return {
        ok: false,
        status: 401,
        error: '未配置 ZENTAO_ADMIN_PASSWORD 或 ZENTAO_API_TOKEN',
      };
    }

    return this.login(account, password);
  }

  async listUsers({ limit = 200, page = 1, deptId = null } = {}) {
    const params = new URLSearchParams({ limit: String(limit), page: String(page) });
    if (deptId != null) params.set('dept', String(deptId));

    return request(`${this.apiUrl('/users')}?${params}`, {
      method: 'GET',
      headers: this.headers(),
      timeout: this.timeout,
    });
  }

  async getUser(userId) {
    return request(this.apiUrl(`/users/${userId}`), {
      method: 'GET',
      headers: this.headers(),
      timeout: this.timeout,
    });
  }

  async getUserByAccount(account) {
    const result = await this.listUsers({ limit: 200 });
    if (!result.ok) return result;

    const users = result.data?.users || [];
    const matched = users.find((user) => String(user.account || '').toLowerCase() === String(account).toLowerCase());
    if (!matched) {
      return { ok: false, status: 404, error: `未找到账号 ${account}` };
    }

    return this.getUser(matched.id);
  }

  async refreshGroupCache() {
    const result = await request(this.apiUrl('/groups'), {
      method: 'GET',
      headers: this.headers(),
      timeout: this.timeout,
    });

    if (result.ok && Array.isArray(result.data)) {
      this.groupCache = {
        groups: result.data,
        byRole: Object.fromEntries(
          result.data
            .filter((group) => group.role)
            .map((group) => [group.role, group.id]),
        ),
      };
    } else {
      this.groupCache = { groups: [], byRole: {} };
    }

    return this.groupCache;
  }

  groupIdForRole(role) {
    if (!this.groupCache) {
      throw new Error('权限组缓存未初始化');
    }
    return this.groupCache.byRole[role] || 2;
  }

  async createUser({
    account,
    realname,
    dept = 1,
    role = 'dev',
    gender = 'm',
    type = 'inside',
    visions = 'rnd',
    password,
    email = '',
    mobile = '',
    group,
  }) {
    let groupValue = group;
    if (groupValue == null) {
      if (!this.groupCache) await this.refreshGroupCache();
      groupValue = this.groupIdForRole(role);
    }

    const body = {
      account,
      realname,
      dept,
      role,
      group: this.formatGroupForCreate(groupValue),
      gender,
      type,
      visions: Array.isArray(visions) ? visions : [visions],
    };

    if (password) body.password = password;
    if (email) body.email = email;
    if (mobile) body.mobile = mobile;

    return request(this.apiUrl('/users'), {
      method: 'POST',
      headers: this.headers(),
      body,
      timeout: this.timeout,
    });
  }

  async setUserGroups(userId, group) {
    const groupIds = this.normalizeGroupIds(group);
    if (!groupIds.length) {
      return { ok: false, status: 422, error: '无效的权限组 ID' };
    }

    const userResult = await this.getUser(userId);
    if (!userResult.ok) {
      return userResult;
    }

    const { restoreUserGroups } = require('./zentao-web.service');
    await this.refreshGroupCache();
    return restoreUserGroups(this, userResult.data.account, groupIds);
  }

  async deleteUser(userId) {
    return request(this.apiUrl(`/users/${userId}`), {
      method: 'DELETE',
      headers: this.headers(),
      timeout: this.timeout,
    });
  }

  async updateUser(userId, fields) {
    if (fields.role && fields.group == null) {
      if (!this.groupCache) await this.refreshGroupCache();
      fields.group = this.groupIdForRole(fields.role);
    }

    if (fields.group != null) {
      return this.setUserGroups(userId, fields.group);
    }

    return request(this.apiUrl(`/users/${userId}`), {
      method: 'PUT',
      headers: this.headers(),
      body: fields,
      timeout: this.timeout,
    });
  }
}

module.exports = { ZentaoAPI };
