const rawInput = document.getElementById('rawInput');
const parseBtn = document.getElementById('parseBtn');
const formSection = document.getElementById('formSection');
const userRows = document.getElementById('userRows');
const rowCount = document.getElementById('rowCount');
const submitBtn = document.getElementById('submitBtn');
const statusBox = document.getElementById('status');
const resultSection = document.getElementById('resultSection');

const POSITION_OPTIONS = window.POSITION_OPTIONS || [];

function setStatus(message, type = 'danger') {
  statusBox.classList.remove('d-none', 'alert-danger', 'alert-success', 'alert-warning');
  statusBox.classList.add(`alert-${type}`);
  statusBox.textContent = message;
}

function clearStatus() {
  statusBox.classList.add('d-none');
  statusBox.textContent = '';
}

function splitLine(trimmed) {
  if (/[,，\t]/.test(trimmed)) {
    return trimmed.split(/[,，\t]+/).map((part) => part.trim()).filter(Boolean);
  }
  return trimmed.split(/\s+/).filter(Boolean);
}

function isGender(value) {
  const text = String(value || '').trim().toLowerCase();
  return ['男', '女', 'm', 'male', 'f', 'female', '0', '1'].includes(text);
}

function isPosition(value) {
  return POSITION_OPTIONS.includes(String(value || '').trim());
}

function assignParts(parts) {
  const result = { name: '', position: '', gender: '男' };

  if (parts.length === 1) {
    const part = parts[0];
    if (isGender(part)) {
      result.gender = normalizeGender(part);
    } else if (isPosition(part)) {
      result.position = part;
    } else {
      result.name = part;
    }
    return result;
  }

  if (parts.length === 2) {
    const [a, b] = parts;
    const aIsGender = isGender(a);
    const bIsGender = isGender(b);
    const aIsPosition = isPosition(a);
    const bIsPosition = isPosition(b);

    if (bIsGender) {
      result.gender = normalizeGender(b);
      if (aIsPosition) result.position = a;
      else result.name = a;
    } else if (aIsGender) {
      result.gender = normalizeGender(a);
      if (bIsPosition) result.position = b;
      else result.name = b;
    } else if (bIsPosition) {
      result.name = a;
      result.position = b;
    } else if (aIsPosition) {
      result.position = a;
      result.name = b;
    } else {
      result.name = a;
      result.position = b;
    }
    return result;
  }

  result.name = parts[0];
  result.position = parts[1];
  result.gender = normalizeGender(parts[2]);
  return result;
}

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const parts = splitLine(trimmed);
  if (!parts.length) return null;

  return assignParts(parts);
}

function normalizeGender(value) {
  const text = String(value || '').trim();
  if (['女', 'f', 'female', '0'].includes(text.toLowerCase())) return '女';
  return '男';
}

function buildPositionOptions(selected) {
  const options = ['<option value="">请选择岗位</option>'];
  POSITION_OPTIONS.forEach((item) => {
    const selectedAttr = item === selected ? ' selected' : '';
    options.push(`<option value="${item}"${selectedAttr}>${item}</option>`);
  });
  return options.join('');
}

function renderUserRow(user, index) {
  const hasError = Boolean(user.error);
  const genderMaleSelected = user.gender !== '女' ? ' selected' : '';
  const genderFemaleSelected = user.gender === '女' ? ' selected' : '';

  return `
    <div class="border rounded p-3 ${hasError ? 'border-danger bg-danger-subtle' : 'bg-white'}" data-row="${index}">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="badge text-bg-light text-dark">第 ${index + 1} 行</span>
        ${hasError ? `<span class="small text-danger">${user.error}</span>` : ''}
      </div>
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">姓名</label>
          <input type="text" class="form-control row-name" value="${escapeHtml(user.name || '')}" ${hasError ? '' : 'required'}>
        </div>
        <div class="col-md-4">
          <label class="form-label">岗位</label>
          <select class="form-select row-position" ${hasError ? '' : 'required'}>
            ${buildPositionOptions(user.position || '')}
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label">性别</label>
          <select class="form-select row-gender" ${hasError ? '' : 'required'}>
            <option value="男"${genderMaleSelected}>男</option>
            <option value="女"${genderFemaleSelected}>女</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function collectRows() {
  return Array.from(userRows.querySelectorAll('[data-row]')).map((row) => ({
    name: row.querySelector('.row-name').value.trim(),
    position: row.querySelector('.row-position').value.trim(),
    gender: row.querySelector('.row-gender').value,
  }));
}

function renderResults(data) {
  const items = (data.results || []).map((item) => {
    if (item.ok) {
      return `
        <div class="list-group-item list-group-item-success">
          <div class="fw-semibold">${escapeHtml(item.realname)} — 创建成功</div>
          <div class="small mt-1">账号：${escapeHtml(item.account)} · 已存入待获取列表</div>
        </div>
      `;
    }
    return `
      <div class="list-group-item list-group-item-danger">
        <div class="fw-semibold">${escapeHtml(item.realname)} — 创建失败</div>
        <div class="small mt-1">${escapeHtml(item.error)}</div>
      </div>
    `;
  }).join('');

  resultSection.innerHTML = `
    <div class="alert ${data.failCount === 0 ? 'alert-success' : 'alert-warning'}">
      ${escapeHtml(data.message)}
    </div>
    <div class="list-group">${items}</div>
  `;
  resultSection.classList.remove('d-none');
}

parseBtn.addEventListener('click', () => {
  clearStatus();
  resultSection.classList.add('d-none');
  resultSection.innerHTML = '';

  const lines = rawInput.value.split('\n');
  const parsed = lines.map(parseLine).filter(Boolean);

  if (!parsed.length) {
    setStatus('请输入至少一行有效的用户信息。');
    formSection.classList.add('d-none');
    return;
  }

  userRows.innerHTML = parsed.map((user, index) => renderUserRow(user, index)).join('');
  rowCount.textContent = `${parsed.length} 条`;
  formSection.classList.remove('d-none');

  clearStatus();
});

submitBtn.addEventListener('click', async () => {
  clearStatus();
  resultSection.classList.add('d-none');
  resultSection.innerHTML = '';

  const users = collectRows();
  const invalid = users.filter((item) => !item.name || !item.position || !item.gender);

  if (!users.length) {
    setStatus('没有可提交的用户，请先识别输入内容。');
    return;
  }

  if (invalid.length) {
    setStatus('请完整填写每一行的姓名、岗位和性别。');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>创建中...';

  try {
    const response = await fetch('/api/users/batch-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users }),
    });

    const data = await response.json();

    if (!response.ok && !data.results) {
      const message = typeof data.error === 'string'
        ? data.error
        : JSON.stringify(data.error || data);
      setStatus(message || '批量创建失败，请稍后重试。');
      return;
    }

    renderResults(data);

    if (data.failCount === 0) {
      setStatus(data.message, 'success');
    } else {
      setStatus(data.message, 'warning');
    }
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-people-fill me-1"></i>批量创建';
  }
});
