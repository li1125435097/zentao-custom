const statusBox = document.getElementById('status');
const userTableBody = document.getElementById('userTableBody');
const pageInfo = document.getElementById('pageInfo');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const refreshBtn = document.getElementById('refreshBtn');
const batchDeleteBtn = document.getElementById('batchDeleteBtn');
const selectedCountEl = document.getElementById('selectedCount');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const confirmDeleteModalEl = document.getElementById('confirmDeleteModal');
const confirmDeleteModal = new bootstrap.Modal(confirmDeleteModalEl);
const confirmSingleUser = document.getElementById('confirmSingleUser');
const confirmUserList = document.getElementById('confirmUserList');
const confirmAccount = document.getElementById('confirmAccount');
const confirmRealname = document.getElementById('confirmRealname');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

const PAGE_SIZE = 20;
let currentPage = 1;
let totalUsers = 0;
let currentUsers = [];
let pendingDeleteUsers = [];
const selectedUsers = new Map();

const GENDER_LABELS = { m: '男', f: '女' };

function setStatus(message, type = 'danger') {
  statusBox.classList.remove('d-none', 'alert-danger', 'alert-success', 'alert-warning');
  statusBox.classList.add(`alert-${type}`);
  statusBox.textContent = message;
}

function clearStatus() {
  statusBox.classList.add('d-none');
  statusBox.textContent = '';
}

function formatGender(gender) {
  return GENDER_LABELS[String(gender || '').toLowerCase()] || gender || '-';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function updateSelectionUI() {
  const count = selectedUsers.size;
  batchDeleteBtn.disabled = count === 0;
  if (count > 0) {
    selectedCountEl.textContent = ` (${count})`;
    selectedCountEl.classList.remove('d-none');
  } else {
    selectedCountEl.textContent = '';
    selectedCountEl.classList.add('d-none');
  }

  if (!currentUsers.length) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    return;
  }

  const selectedOnPage = currentUsers.filter((user) => selectedUsers.has(user.id)).length;
  selectAllCheckbox.checked = selectedOnPage === currentUsers.length;
  selectAllCheckbox.indeterminate = selectedOnPage > 0 && selectedOnPage < currentUsers.length;
}

function renderEmptyRow(message) {
  userTableBody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center text-muted py-4">${message}</td>
    </tr>
  `;
  currentUsers = [];
  updateSelectionUI();
}

function renderUsers(users) {
  currentUsers = users;

  if (!users.length) {
    renderEmptyRow('暂无用户数据');
    return;
  }

  userTableBody.innerHTML = users.map((user) => {
    const checked = selectedUsers.has(user.id) ? ' checked' : '';
    return `
      <tr>
        <td>
          <input
            class="form-check-input row-checkbox"
            type="checkbox"
            aria-label="选择用户 ${escapeHtml(user.account)}"
            data-id="${user.id}"
            data-account="${escapeHtml(user.account || '')}"
            data-realname="${escapeHtml(user.realname || '')}"
            ${checked}
          >
        </td>
        <td>${user.id ?? '-'}</td>
        <td><code>${escapeHtml(user.account || '-')}</code></td>
        <td>${escapeHtml(user.realname || '-')}</td>
        <td>${escapeHtml(user.role || '-')}</td>
        <td>${user.dept ?? '-'}</td>
        <td>${formatGender(user.gender)}</td>
        <td class="text-end">
          <button
            type="button"
            class="btn btn-sm btn-outline-danger delete-btn"
            data-id="${user.id}"
            data-account="${escapeHtml(user.account || '')}"
            data-realname="${escapeHtml(user.realname || '')}"
          >
            <i class="bi bi-trash me-1"></i>删除
          </button>
        </td>
      </tr>
    `;
  }).join('');

  updateSelectionUI();
}

function updatePagination() {
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  pageInfo.textContent = `共 ${totalUsers} 条，第 ${currentPage} / ${totalPages} 页`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

function toggleUserSelection(user, checked) {
  if (checked) {
    selectedUsers.set(user.id, user);
  } else {
    selectedUsers.delete(user.id);
  }
  updateSelectionUI();
}

function toggleCurrentPageSelection(checked) {
  currentUsers.forEach((user) => {
    if (checked) {
      selectedUsers.set(user.id, {
        id: user.id,
        account: user.account,
        realname: user.realname,
      });
    } else {
      selectedUsers.delete(user.id);
    }
  });
  userTableBody.querySelectorAll('.row-checkbox').forEach((checkbox) => {
    checkbox.checked = checked;
  });
  updateSelectionUI();
}

async function loadUsers() {
  clearStatus();
  renderEmptyRow('加载中...');

  const params = new URLSearchParams({
    page: String(currentPage),
    limit: String(PAGE_SIZE),
  });

  const keyword = searchInput.value.trim();
  if (keyword) {
    params.set('search', keyword);
  }

  try {
    const response = await fetch(`/api/users?${params}`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      const message = typeof data.error === 'string'
        ? data.error
        : JSON.stringify(data.error || data);
      setStatus(message || '加载用户列表失败');
      renderEmptyRow('加载失败');
      return;
    }

    totalUsers = Number(data.total) || 0;
    if (keyword) {
      currentPage = 1;
    }
    renderUsers(data.users || []);
    updatePagination();
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
    renderEmptyRow('加载失败');
  }
}

function openDeleteConfirm(users) {
  pendingDeleteUsers = users;
  const isBatch = users.length > 1;

  confirmSingleUser.classList.toggle('d-none', isBatch);
  confirmUserList.classList.toggle('d-none', !isBatch);

  if (isBatch) {
    confirmUserList.innerHTML = users.map((user) => `
      <li class="list-group-item px-0">
        <code>${escapeHtml(user.account || '-')}</code>
        <span class="text-muted ms-2">${escapeHtml(user.realname || '-')}</span>
      </li>
    `).join('');
  } else {
    const user = users[0];
    confirmAccount.textContent = user.account || '-';
    confirmRealname.textContent = user.realname || '-';
  }

  confirmDeleteBtn.disabled = false;
  confirmDeleteBtn.innerHTML = `<i class="bi bi-trash me-1"></i>确认删除${isBatch ? ` (${users.length})` : ''}`;
  confirmDeleteModal.show();
}

async function deleteUsers(users) {
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>删除中...';

  const failed = [];
  let successCount = 0;

  try {
    for (const user of users) {
      const response = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        const message = typeof data.error === 'string'
          ? data.error
          : JSON.stringify(data.error || data);
        failed.push(`${user.account || user.id}: ${message || '删除失败'}`);
        continue;
      }

      successCount += 1;
      selectedUsers.delete(user.id);
    }

    confirmDeleteModal.hide();

    if (failed.length === 0) {
      setStatus(
        users.length === 1 ? '用户已删除。' : `已成功删除 ${successCount} 个用户。`,
        'success',
      );
    } else if (successCount > 0) {
      setStatus(`成功 ${successCount} 个，失败 ${failed.length} 个：${failed.join('；')}`, 'warning');
    } else {
      setStatus(failed.join('；'));
    }

    await loadUsers();
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.innerHTML = `<i class="bi bi-trash me-1"></i>确认删除${users.length > 1 ? ` (${users.length})` : ''}`;
  }
}

searchBtn.addEventListener('click', () => {
  currentPage = 1;
  loadUsers();
});

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    currentPage = 1;
    loadUsers();
  }
});

refreshBtn.addEventListener('click', () => {
  searchInput.value = '';
  currentPage = 1;
  selectedUsers.clear();
  loadUsers();
});

batchDeleteBtn.addEventListener('click', () => {
  const users = Array.from(selectedUsers.values());
  if (!users.length) return;
  openDeleteConfirm(users);
});

selectAllCheckbox.addEventListener('change', () => {
  toggleCurrentPageSelection(selectAllCheckbox.checked);
});

prevPageBtn.addEventListener('click', () => {
  if (currentPage <= 1) return;
  currentPage -= 1;
  loadUsers();
});

nextPageBtn.addEventListener('click', () => {
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  if (currentPage >= totalPages) return;
  currentPage += 1;
  loadUsers();
});

userTableBody.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('.delete-btn');
  if (!deleteButton) return;

  openDeleteConfirm([{
    id: Number(deleteButton.dataset.id),
    account: deleteButton.dataset.account,
    realname: deleteButton.dataset.realname,
  }]);
});

userTableBody.addEventListener('change', (event) => {
  const checkbox = event.target.closest('.row-checkbox');
  if (!checkbox) return;

  toggleUserSelection({
    id: Number(checkbox.dataset.id),
    account: checkbox.dataset.account,
    realname: checkbox.dataset.realname,
  }, checkbox.checked);
});

confirmDeleteBtn.addEventListener('click', () => {
  if (!pendingDeleteUsers.length) return;
  deleteUsers(pendingDeleteUsers);
});

confirmDeleteModalEl.addEventListener('hidden.bs.modal', () => {
  pendingDeleteUsers = [];
});

loadUsers();
