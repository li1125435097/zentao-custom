const fetchForm = document.getElementById('fetchForm');
const nameInput = document.getElementById('nameInput');
const fetchBtn = document.getElementById('fetchBtn');
const statusBox = document.getElementById('status');
const reApplyBox = document.getElementById('reApplyBox');
const reApplyBtn = document.getElementById('reApplyBtn');
const resultBox = document.getElementById('resultBox');
const copyAllBtn = document.getElementById('copyAllBtn');

const resultUrl = document.getElementById('resultUrl');
const resultAccount = document.getElementById('resultAccount');
const resultPassword = document.getElementById('resultPassword');
const resultName = document.getElementById('resultName');
const resultPosition = document.getElementById('resultPosition');
const resultDept = document.getElementById('resultDept');

let latestResult = null;

function setStatus(message, type = 'danger') {
  statusBox.classList.remove('d-none', 'alert-danger', 'alert-success', 'alert-warning');
  statusBox.classList.add(`alert-${type}`);
  statusBox.textContent = message;
}

function clearStatus() {
  statusBox.classList.add('d-none');
  statusBox.textContent = '';
  reApplyBox.classList.add('d-none');
}

function showReApplyOption(name) {
  reApplyBox.classList.remove('d-none');
  reApplyBtn.dataset.name = name;
  reApplyBtn.disabled = false;
  reApplyBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>申请变更密码重新获取账号';
}

function formatAllAccountInfo(data) {
  return [
    `网址：${data.url}`,
    `账号：${data.account}`,
    `密码：${data.password}`,
    `姓名：${data.realname}`,
    `岗位：${data.position}`,
    `部门：${data.deptName}`,
  ].join('\n');
}

function showResult(data) {
  latestResult = data;
  resultUrl.textContent = data.url;
  resultUrl.href = data.url;
  resultAccount.textContent = data.account;
  resultPassword.textContent = data.password;
  resultName.textContent = data.realname;
  resultPosition.textContent = data.position;
  resultDept.textContent = data.deptName;
  resultBox.classList.remove('d-none');
}

fetchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStatus();
  resultBox.classList.add('d-none');
  latestResult = null;

  const name = nameInput.value.trim();
  if (!name) {
    setStatus('请输入姓名。');
    return;
  }

  fetchBtn.disabled = true;
  fetchBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>获取中...';

  try {
    const response = await fetch('/api/pending-users/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      const message = typeof data.error === 'string'
        ? data.error
        : JSON.stringify(data.error || data);
      setStatus(message || '获取失败，请稍后重试。');
      if (response.status === 409 && message === '该用户信息已被获取，无法重复获取') {
        showReApplyOption(name);
      }
      return;
    }

    showResult(data);
    clearStatus();
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = '<i class="bi bi-download me-1"></i>获取用户信息';
  }
});

copyAllBtn.addEventListener('click', () => {
  if (!latestResult) return;
  ClipboardUtil.copyText(
    formatAllAccountInfo(latestResult),
    copyAllBtn,
    '<i class="bi bi-clipboard me-1"></i>复制全部信息',
    resultBox,
  );
});

reApplyBtn.addEventListener('click', async () => {
  const name = reApplyBtn.dataset.name || nameInput.value.trim();
  if (!name) {
    setStatus('请输入姓名。');
    return;
  }

  reApplyBtn.disabled = true;
  reApplyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>提交中...';

  try {
    const response = await fetch('/api/pending-users/reapply-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      const message = typeof data.error === 'string'
        ? data.error
        : JSON.stringify(data.error || data);
      setStatus(message || '申请失败，请稍后重试。');
      reApplyBtn.disabled = false;
      reApplyBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>申请变更密码重新获取账号';
      return;
    }

    reApplyBox.classList.add('d-none');
    setStatus(data.message || '已提交重新获取申请，请等待管理员处理', 'success');
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
    reApplyBtn.disabled = false;
    reApplyBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>申请变更密码重新获取账号';
  }
});
