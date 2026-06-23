const pendingTableBody = document.getElementById('pendingTableBody');
const statusBox = document.getElementById('status');
const summaryInfo = document.getElementById('summaryInfo');
const refreshBtn = document.getElementById('refreshBtn');
const rangeInputs = document.querySelectorAll('input[name="rangeFilter"]');

let allUsers = [];

function setStatus(message, type = 'danger') {
  statusBox.classList.remove('d-none', 'alert-danger', 'alert-success', 'alert-warning');
  statusBox.classList.add(`alert-${type}`);
  statusBox.textContent = message;
}

function clearStatus() {
  statusBox.classList.add('d-none');
  statusBox.textContent = '';
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSelectedRange() {
  const checked = document.querySelector('input[name="rangeFilter"]:checked');
  return checked ? checked.value : '2days';
}

function filterByRange(users, range) {
  if (range === 'all') return users;

  const now = Date.now();
  const days = range === 'week' ? 7 : 2;
  const cutoff = now - days * 24 * 60 * 60 * 1000;

  return users.filter((user) => {
    const created = new Date(user.createdAt).getTime();
    return !Number.isNaN(created) && created >= cutoff;
  });
}

function renderStatusBadge(user) {
  if (user.apply) {
    return '<span class="badge text-bg-info">申请中</span>';
  }
  if (user.reApply) {
    return '<span class="badge text-bg-warning text-dark">待处理</span>';
  }
  if (user.fetched) {
    return '<span class="badge text-bg-success">已获取</span>';
  }
  return '<span class="badge text-bg-secondary">未获取</span>';
}

function renderActionCell(user) {
  if (user.apply) {
    return `
      <button
        type="button"
        class="btn btn-sm btn-primary apply-btn"
        data-id="${escapeHtml(user.id)}"
        data-name="${escapeHtml(user.realname || '')}"
        data-position="${escapeHtml(user.position || '')}"
        data-gender="${escapeHtml(user.gender || '')}"
      >
        <i class="bi bi-person-plus me-1"></i>申请
      </button>
    `;
  }
  if (!user.reApply) {
    return '—';
  }
  return `
    <button
      type="button"
      class="btn btn-sm btn-outline-warning text-dark process-btn"
      data-id="${escapeHtml(user.id)}"
      data-account="${escapeHtml(user.account || '')}"
      data-realname="${escapeHtml(user.realname || '')}"
    >
      <i class="bi bi-key me-1"></i>处理
    </button>
  `;
}

function renderTable(users) {
  if (users.length === 0) {
    pendingTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted py-4">暂无数据</td>
      </tr>
    `;
    summaryInfo.textContent = '共 0 条';
    return;
  }

  const sorted = [...users].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  pendingTableBody.innerHTML = sorted.map((user) => `
    <tr>
      <td>${escapeHtml(user.realname || '—')}</td>
      <td>${escapeHtml(user.position || '—')}</td>
      <td>${escapeHtml(user.deptName || '—')}</td>
      <td>${escapeHtml(user.gender || '—')}</td>
      <td><code>${escapeHtml(user.account || '—')}</code></td>
      <td>${renderStatusBadge(user)}</td>
      <td class="text-nowrap">${formatDateTime(user.createdAt)}</td>
      <td class="text-nowrap">${formatDateTime(user.fetchedAt)}</td>
      <td class="text-nowrap">${renderActionCell(user)}</td>
    </tr>
  `).join('');

  const fetchedCount = users.filter((u) => u.fetched).length;
  const reApplyCount = users.filter((u) => u.reApply).length;
  const applyCount = users.filter((u) => u.apply).length;
  summaryInfo.textContent = `共 ${users.length} 条，已获取 ${fetchedCount} 条，未获取 ${users.length - fetchedCount} 条${applyCount ? `，申请中 ${applyCount} 条` : ''}${reApplyCount ? `，待处理 ${reApplyCount} 条` : ''}`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function applyFilter() {
  const filtered = filterByRange(allUsers, getSelectedRange());
  renderTable(filtered);
}

async function loadPendingUsers() {
  pendingTableBody.innerHTML = `
    <tr>
      <td colspan="9" class="text-center text-muted py-4">加载中...</td>
    </tr>
  `;
  clearStatus();

  try {
    const response = await fetch('/api/pending-users');
    const data = await response.json();

    if (!response.ok || !data.ok) {
      const message = typeof data.error === 'string'
        ? data.error
        : '加载失败，请稍后重试。';
      setStatus(message);
      pendingTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center text-muted py-4">加载失败</td>
        </tr>
      `;
      summaryInfo.textContent = '';
      return;
    }

    allUsers = Array.isArray(data.data) ? data.data : [];
    applyFilter();
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
    pendingTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted py-4">加载失败</td>
      </tr>
    `;
    summaryInfo.textContent = '';
  }
}

rangeInputs.forEach((input) => {
  input.addEventListener('change', applyFilter);
});

refreshBtn.addEventListener('click', loadPendingUsers);

const confirmProcessModalEl = document.getElementById('confirmProcessModal');
const confirmProcessModal = new bootstrap.Modal(confirmProcessModalEl);
const confirmAccount = document.getElementById('confirmAccount');
const confirmRealname = document.getElementById('confirmRealname');
const confirmProcessBtn = document.getElementById('confirmProcessBtn');
const resultModalEl = document.getElementById('resultModal');
const resultModal = new bootstrap.Modal(resultModalEl);
const resultAccount = document.getElementById('resultAccount');
const resultRealname = document.getElementById('resultRealname');
const resultPassword = document.getElementById('resultPassword');
const copyPasswordBtn = document.getElementById('copyPasswordBtn');

let pendingProcessUser = null;
let latestPassword = null;

function openProcessConfirm(user) {
  pendingProcessUser = user;
  confirmAccount.textContent = user.account || '-';
  confirmRealname.textContent = user.realname || '-';
  confirmProcessBtn.disabled = false;
  confirmProcessBtn.innerHTML = '<i class="bi bi-key me-1"></i>确认处理';
  confirmProcessModal.show();
}

function showProcessResult(data) {
  latestPassword = data.password;
  resultAccount.textContent = data.account || '-';
  resultRealname.textContent = data.realname || '-';
  resultPassword.textContent = data.password || '-';
  copyPasswordBtn.innerHTML = '<i class="bi bi-clipboard me-1"></i>复制密码';
  resultModal.show();
}

async function processReApply(user) {
  confirmProcessBtn.disabled = true;
  confirmProcessBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>处理中...';

  try {
    const response = await fetch(`/api/pending-users/${user.id}/process-reapply`, {
      method: 'POST',
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      const message = typeof data.error === 'string'
        ? data.error
        : JSON.stringify(data.error || data);
      setStatus(message || '处理失败');
      confirmProcessBtn.disabled = false;
      confirmProcessBtn.innerHTML = '<i class="bi bi-key me-1"></i>确认处理';
      return;
    }

    confirmProcessModal.hide();
    if (data.warning) {
      setStatus(data.warning, 'warning');
    } else {
      setStatus(data.message || '处理成功，用户可重新获取账号信息', 'success');
    }
    showProcessResult(data);
    loadPendingUsers();
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
    confirmProcessBtn.disabled = false;
    confirmProcessBtn.innerHTML = '<i class="bi bi-key me-1"></i>确认处理';
  }
}

pendingTableBody.addEventListener('click', (event) => {
  const applyButton = event.target.closest('.apply-btn');
  if (applyButton) {
    processApply({
      id: applyButton.dataset.id,
      realname: applyButton.dataset.name,
      position: applyButton.dataset.position,
      gender: applyButton.dataset.gender,
      button: applyButton,
    });
    return;
  }

  const processButton = event.target.closest('.process-btn');
  if (!processButton) return;

  openProcessConfirm({
    id: processButton.dataset.id,
    account: processButton.dataset.account,
    realname: processButton.dataset.realname,
  });
});

async function processApply(user) {
  const { button } = user;
  const defaultHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  clearStatus();

  try {
    const response = await fetch('/api/users/batch-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        users: [{
          name: user.realname,
          position: user.position,
          gender: user.gender,
          pendingId: user.id,
        }],
      }),
    });

    const data = await response.json();
    const result = Array.isArray(data.results) ? data.results[0] : null;

    if (!response.ok || !result?.ok) {
      const message = result?.error
        || (typeof data.error === 'string' ? data.error : null)
        || data.message
        || '创建失败，请稍后重试。';
      setStatus(message);
      return;
    }

    if (data.warning || result.warning) {
      setStatus(data.warning || result.warning, 'warning');
    } else {
      setStatus(`${result.realname} 账号创建成功，已存入待获取列表`, 'success');
    }
    loadPendingUsers();
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
  } finally {
    button.disabled = false;
    button.innerHTML = defaultHtml;
  }
}

confirmProcessBtn.addEventListener('click', () => {
  if (!pendingProcessUser) return;
  processReApply(pendingProcessUser);
});

confirmProcessModalEl.addEventListener('hidden.bs.modal', () => {
  pendingProcessUser = null;
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

loadPendingUsers();
