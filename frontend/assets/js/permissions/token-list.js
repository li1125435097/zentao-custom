const tokenTableBody = document.getElementById('tokenTableBody');
const statusBox = document.getElementById('status');
const summaryInfo = document.getElementById('summaryInfo');
const refreshBtn = document.getElementById('refreshBtn');
const addTokenBtn = document.getElementById('addTokenBtn');
const addTokenModalEl = document.getElementById('addTokenModal');
const addTokenModal = new bootstrap.Modal(addTokenModalEl);
const addTokenForm = document.getElementById('addTokenForm');
const realnameInput = document.getElementById('realname');
const submitTokenBtn = document.getElementById('submitTokenBtn');

function setStatus(message, type = 'danger') {
  statusBox.classList.remove('d-none', 'alert-danger', 'alert-success', 'alert-warning');
  statusBox.classList.add(`alert-${type}`);
  statusBox.textContent = message;
}

function clearStatus() {
  statusBox.classList.add('d-none');
  statusBox.textContent = '';
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildLoginUrl(token) {
  const value = String(token || '').trim();
  if (!value) {
    return '';
  }
  return `${window.location.origin}/api/login?token=${encodeURIComponent(value)}`;
}

function renderCopyAddressCell(item) {
  const loginUrl = buildLoginUrl(item.token);
  if (!loginUrl) {
    return '<span class="text-muted">—</span>';
  }

  return `
    <div class="d-flex align-items-center gap-2">
      <code class="small text-break user-select-all">${escapeHtml(loginUrl)}</code>
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm flex-shrink-0 copy-login-url-btn"
        data-login-url="${escapeHtml(loginUrl)}"
        title="复制登录地址"
      >
        <i class="bi bi-clipboard"></i>
      </button>
    </div>
  `;
}

async function copyLoginUrl(button) {
  const loginUrl = button.dataset.loginUrl;
  if (!loginUrl) {
    return;
  }

  const defaultHtml = button.innerHTML;

  try {
    await navigator.clipboard.writeText(loginUrl);
    button.innerHTML = '<i class="bi bi-check-lg"></i>';
    setTimeout(() => {
      button.innerHTML = defaultHtml;
    }, 1500);
  } catch {
    setStatus('复制失败，请手动复制。');
  }
}

function renderStatusSwitch(item) {
  const enabled = item.status === 'enabled';
  const label = enabled ? '启用' : '停用';

  return `
    <div class="form-check form-switch mb-0">
      <input
        class="form-check-input token-status-switch"
        type="checkbox"
        role="switch"
        data-token-id="${escapeHtml(item.id)}"
        aria-label="${escapeHtml(label)}"
        ${enabled ? 'checked' : ''}
      >
      <label class="form-check-label small">${label}</label>
    </div>
  `;
}

function renderTable(tokens) {
  if (tokens.length === 0) {
    tokenTableBody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center text-muted py-4">暂无数据</td>
      </tr>
    `;
    summaryInfo.textContent = '共 0 条';
    return;
  }

  const sorted = [...tokens].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  tokenTableBody.innerHTML = sorted.map((item) => `
    <tr>
      <td><code class="user-select-all">${escapeHtml(item.token || '—')}</code></td>
      <td>${renderStatusSwitch(item)}</td>
      <td>${renderCopyAddressCell(item)}</td>
    </tr>
  `).join('');

  const enabledCount = tokens.filter((item) => item.status === 'enabled').length;
  summaryInfo.textContent = `共 ${tokens.length} 条，启用 ${enabledCount} 条`;
}

async function loadTokens() {
  tokenTableBody.innerHTML = `
    <tr>
      <td colspan="3" class="text-center text-muted py-4">加载中...</td>
    </tr>
  `;
  clearStatus();

  try {
    const response = await fetch('/api/tokens');
    const data = await response.json();

    if (!response.ok || !data.ok) {
      const message = typeof data.error === 'string'
        ? data.error
        : '加载失败，请稍后重试。';
      setStatus(message);
      tokenTableBody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center text-muted py-4">加载失败</td>
        </tr>
      `;
      summaryInfo.textContent = '';
      return;
    }

    renderTable(Array.isArray(data.data) ? data.data : []);
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
    tokenTableBody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center text-muted py-4">加载失败</td>
      </tr>
    `;
    summaryInfo.textContent = '';
  }
}

async function createToken(realname) {
  const defaultHtml = submitTokenBtn.innerHTML;
  submitTokenBtn.disabled = true;
  submitTokenBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>生成中...';

  try {
    const response = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ realname }),
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      const message = typeof data.error === 'string'
        ? data.error
        : '创建失败，请稍后重试。';
      setStatus(message);
      return;
    }

    addTokenModal.hide();
    setStatus(data.message || 'Token 创建成功', 'success');
    loadTokens();
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
  } finally {
    submitTokenBtn.disabled = false;
    submitTokenBtn.innerHTML = defaultHtml;
  }
}

addTokenBtn.addEventListener('click', () => {
  addTokenForm.reset();
  clearStatus();
  addTokenModal.show();
});

addTokenForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const realname = realnameInput.value.trim();
  if (!realname) {
    realnameInput.focus();
    return;
  }
  createToken(realname);
});

addTokenModalEl.addEventListener('hidden.bs.modal', () => {
  addTokenForm.reset();
  submitTokenBtn.disabled = false;
  submitTokenBtn.innerHTML = '<i class="bi bi-plus-lg me-1"></i>生成 Token';
});

async function updateTokenStatus(tokenId, enabled, switchInput) {
  switchInput.disabled = true;

  try {
    const response = await fetch(`/api/tokens/${encodeURIComponent(tokenId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: enabled ? 'enabled' : 'disabled' }),
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      const message = typeof data.error === 'string'
        ? data.error
        : '状态更新失败，请稍后重试。';
      setStatus(message);
      switchInput.checked = !enabled;
      return;
    }

    clearStatus();
    const row = switchInput.closest('tr');
    const label = row?.querySelector('.form-check-label');
    if (label) {
      label.textContent = enabled ? '启用' : '停用';
    }
    switchInput.setAttribute('aria-label', enabled ? '启用' : '停用');

    const enabledCount = tokenTableBody.querySelectorAll('.token-status-switch:checked').length;
    const totalCount = tokenTableBody.querySelectorAll('.token-status-switch').length;
    summaryInfo.textContent = `共 ${totalCount} 条，启用 ${enabledCount} 条`;
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
    switchInput.checked = !enabled;
  } finally {
    switchInput.disabled = false;
  }
}

tokenTableBody.addEventListener('click', (event) => {
  const copyBtn = event.target.closest('.copy-login-url-btn');
  if (copyBtn) {
    copyLoginUrl(copyBtn);
    return;
  }
});

tokenTableBody.addEventListener('change', (event) => {
  const switchInput = event.target.closest('.token-status-switch');
  if (!switchInput) {
    return;
  }

  const tokenId = switchInput.dataset.tokenId;
  if (!tokenId) {
    return;
  }

  updateTokenStatus(tokenId, switchInput.checked, switchInput);
});

refreshBtn.addEventListener('click', loadTokens);

loadTokens();
