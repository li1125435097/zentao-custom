const statusBox = document.getElementById('status');
const userTableBody = document.getElementById('userTableBody');
const pageInfo = document.getElementById('pageInfo');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const refreshBtn = document.getElementById('refreshBtn');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const confirmResetModalEl = document.getElementById('confirmResetModal');
const confirmResetModal = new bootstrap.Modal(confirmResetModalEl);
const confirmAccount = document.getElementById('confirmAccount');
const confirmRealname = document.getElementById('confirmRealname');
const confirmResetBtn = document.getElementById('confirmResetBtn');
const resultModalEl = document.getElementById('resultModal');
const resultModal = new bootstrap.Modal(resultModalEl);
const resultAccount = document.getElementById('resultAccount');
const resultRealname = document.getElementById('resultRealname');
const resultPassword = document.getElementById('resultPassword');
const copyPasswordBtn = document.getElementById('copyPasswordBtn');

const PAGE_SIZE = 20;
let currentPage = 1;
let totalUsers = 0;
let currentUsers = [];
let pendingResetUser = null;
let latestPassword = null;

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

function renderEmptyRow(message) {
  userTableBody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center text-muted py-4">${message}</td>
    </tr>
  `;
  currentUsers = [];
}

function renderUsers(users) {
  currentUsers = users;

  if (!users.length) {
    renderEmptyRow('暂无用户数据');
    return;
  }

  userTableBody.innerHTML = users.map((user) => `
    <tr>
      <td>${user.id ?? '-'}</td>
      <td><code>${escapeHtml(user.account || '-')}</code></td>
      <td>${escapeHtml(user.realname || '-')}</td>
      <td>${escapeHtml(user.role || '-')}</td>
      <td>${user.dept ?? '-'}</td>
      <td>${formatGender(user.gender)}</td>
      <td class="text-end">
        <button
          type="button"
          class="btn btn-sm btn-outline-warning text-dark reset-btn"
          data-id="${user.id}"
          data-account="${escapeHtml(user.account || '')}"
          data-realname="${escapeHtml(user.realname || '')}"
        >
          <i class="bi bi-key me-1"></i>修改密码
        </button>
      </td>
    </tr>
  `).join('');
}

function updatePagination() {
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  pageInfo.textContent = `共 ${totalUsers} 条，第 ${currentPage} / ${totalPages} 页`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
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

function openResetConfirm(user) {
  pendingResetUser = user;
  confirmAccount.textContent = user.account || '-';
  confirmRealname.textContent = user.realname || '-';
  confirmResetBtn.disabled = false;
  confirmResetBtn.innerHTML = '<i class="bi bi-key me-1"></i>确认重置';
  confirmResetModal.show();
}

function showResult(data) {
  latestPassword = data.password;
  resultAccount.textContent = data.account || '-';
  resultRealname.textContent = data.realname || '-';
  resultPassword.textContent = data.password || '-';
  copyPasswordBtn.innerHTML = '<i class="bi bi-clipboard me-1"></i>复制密码';
  resultModal.show();
}

async function resetPassword(user) {
  confirmResetBtn.disabled = true;
  confirmResetBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>重置中...';

  try {
    const response = await fetch(`/api/users/${user.id}/password`, { method: 'PUT' });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      const message = typeof data.error === 'string'
        ? data.error
        : JSON.stringify(data.error || data);
      setStatus(message || '密码重置失败');
      confirmResetBtn.disabled = false;
      confirmResetBtn.innerHTML = '<i class="bi bi-key me-1"></i>确认重置';
      return;
    }

    confirmResetModal.hide();
    if (data.warning) {
      setStatus(data.warning, 'warning');
    } else {
      clearStatus();
    }
    showResult(data);
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
    confirmResetBtn.disabled = false;
    confirmResetBtn.innerHTML = '<i class="bi bi-key me-1"></i>确认重置';
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
  loadUsers();
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
  const resetButton = event.target.closest('.reset-btn');
  if (!resetButton) return;

  openResetConfirm({
    id: Number(resetButton.dataset.id),
    account: resetButton.dataset.account,
    realname: resetButton.dataset.realname,
  });
});

confirmResetBtn.addEventListener('click', () => {
  if (!pendingResetUser) return;
  resetPassword(pendingResetUser);
});

confirmResetModalEl.addEventListener('hidden.bs.modal', () => {
  pendingResetUser = null;
});

copyPasswordBtn.addEventListener('click', () => {
  if (!latestPassword) return;
  ClipboardUtil.copyText(
    latestPassword,
    copyPasswordBtn,
    '<i class="bi bi-clipboard me-1"></i>复制密码',
    resultModalEl.querySelector('.modal-content'),
  );
});

loadUsers();
