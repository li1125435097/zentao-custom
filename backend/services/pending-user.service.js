'use strict';

const crypto = require('node:crypto');
const { readCollection, writeCollection } = require('./json-db.service');

const COLLECTION = 'pending-users';

function listPendingUsers() {
  return readCollection(COLLECTION, []);
}

function savePendingUsers(users) {
  writeCollection(COLLECTION, users);
}

function addPendingUser(record) {
  const users = listPendingUsers();
  const entry = {
    id: crypto.randomUUID(),
    apply: false,
    fetched: false,
    reApply: false,
    createdAt: new Date().toISOString(),
    ...record,
  };
  users.push(entry);
  savePendingUsers(users);
  return entry;
}

function addApplyRequest({ realname, position, gender }) {
  const name = String(realname || '').trim();
  const pos = String(position || '').trim();
  const gen = String(gender || '').trim();

  if (!name || !pos || !gen) {
    return { ok: false, error: '请填写姓名、岗位、性别', status: 400 };
  }

  const users = listPendingUsers();
  const duplicate = users.find((item) => item.realname === name && item.apply);
  if (duplicate) {
    return { ok: false, error: '该姓名已有申请中的记录', status: 409 };
  }

  const entry = {
    id: crypto.randomUUID(),
    apply: true,
    fetched: false,
    reApply: false,
    createdAt: new Date().toISOString(),
    realname: name,
    position: pos,
    gender: gen,
  };
  users.push(entry);
  savePendingUsers(users);
  return { ok: true, data: entry };
}

function updatePendingUserAfterCreate(id, record) {
  const found = findPendingUserById(id);
  if (!found.ok) {
    return found;
  }

  if (!found.user.apply) {
    return { ok: false, error: '该记录不是申请中状态', status: 400 };
  }

  const users = listPendingUsers();
  Object.assign(users[found.index], {
    ...record,
    apply: false,
  });
  savePendingUsers(users);
  return { ok: true, data: users[found.index] };
}

function findPositionByAccountOrRealname(account, realname) {
  const users = listPendingUsers();
  const normalizedAccount = String(account || '').trim().toLowerCase();
  const normalizedName = String(realname || '').trim();

  if (normalizedAccount) {
    const match = [...users].reverse().find(
      (item) => String(item.account || '').trim().toLowerCase() === normalizedAccount
        && String(item.position || '').trim(),
    );
    if (match) {
      return String(match.position).trim();
    }
  }

  if (normalizedName) {
    const match = [...users].reverse().find(
      (item) => String(item.realname || '').trim() === normalizedName
        && String(item.position || '').trim(),
    );
    if (match) {
      return String(match.position).trim();
    }
  }

  return null;
}

function fetchPendingUserByName(realname) {
  const name = String(realname || '').trim();
  if (!name) {
    return { ok: false, error: '请填写姓名', status: 400 };
  }

  const users = listPendingUsers();
  const index = users.findIndex((item) => item.realname === name && !item.fetched);

  if (index === -1) {
    const fetched = users.some((item) => item.realname === name && item.fetched);
    if (fetched) {
      return { ok: false, error: '该用户信息已被获取，无法重复获取', status: 409 };
    }
    return { ok: false, error: '未找到待获取的用户信息', status: 404 };
  }

  users[index].fetched = true;
  users[index].fetchedAt = new Date().toISOString();
  savePendingUsers(users);

  return {
    ok: true,
    data: users[index],
  };
}

function requestReApplyByName(realname) {
  const name = String(realname || '').trim();
  if (!name) {
    return { ok: false, error: '请填写姓名', status: 400 };
  }

  const users = listPendingUsers();
  const index = users.findIndex((item) => item.realname === name && item.fetched);

  if (index === -1) {
    const exists = users.some((item) => item.realname === name);
    if (!exists) {
      return { ok: false, error: '未找到待获取的用户信息', status: 404 };
    }
    return { ok: false, error: '该用户信息尚未被获取，无需申请', status: 400 };
  }

  if (users[index].reApply) {
    return { ok: false, error: '已提交重新获取申请，请等待处理', status: 409 };
  }

  users[index].reApply = true;
  users[index].reApplyAt = new Date().toISOString();
  savePendingUsers(users);

  return { ok: true, data: users[index] };
}

function findPendingUserById(id) {
  const users = listPendingUsers();
  const index = users.findIndex((item) => item.id === id);
  if (index === -1) {
    return { ok: false, error: '未找到待获取记录', status: 404 };
  }
  return { ok: true, index, user: users[index] };
}

function markPendingUserUnfetched(id, { password } = {}) {
  const found = findPendingUserById(id);
  if (!found.ok) {
    return found;
  }

  const users = listPendingUsers();
  users[found.index].fetched = false;
  users[found.index].reApply = false;
  delete users[found.index].fetchedAt;
  delete users[found.index].reApplyAt;
  if (password) {
    users[found.index].password = password;
  }
  savePendingUsers(users);

  return { ok: true, data: users[found.index] };
}

module.exports = {
  listPendingUsers,
  addPendingUser,
  addApplyRequest,
  updatePendingUserAfterCreate,
  findPositionByAccountOrRealname,
  fetchPendingUserByName,
  requestReApplyByName,
  findPendingUserById,
  markPendingUserUnfetched,
};
