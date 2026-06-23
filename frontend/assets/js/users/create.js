const form = document.getElementById('registerForm');
const submitBtn = document.getElementById('submitBtn');
const statusBox = document.getElementById('status');
const positionSelect = document.getElementById('position');
const resultModalEl = document.getElementById('resultModal');
const resultModal = new bootstrap.Modal(resultModalEl);
const copyAllBtn = document.getElementById('copyAllBtn');

const resultUrl = document.getElementById('resultUrl');
const resultAccount = document.getElementById('resultAccount');
const resultPassword = document.getElementById('resultPassword');
const resultName = document.getElementById('resultName');
const resultPosition = document.getElementById('resultPosition');
const resultDept = document.getElementById('resultDept');

let latestResult = null;

function fillPositionOptions() {
  const options = window.POSITION_OPTIONS || [];
  positionSelect.innerHTML = '<option value="">请选择岗位</option>';
  options.forEach((item) => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    positionSelect.appendChild(option);
  });
}

function setStatus(message, type = 'danger') {
  statusBox.classList.remove('d-none', 'alert-danger', 'alert-success', 'alert-warning');
  statusBox.classList.add(`alert-${type}`);
  statusBox.textContent = message;
}

function clearStatus() {
  statusBox.classList.add('d-none');
  statusBox.textContent = '';
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
  copyAllBtn.innerHTML = '<i class="bi bi-clipboard me-1"></i>复制全部信息';
  resultModal.show();
}

async function copyText(text, button, defaultLabel) {
  try {
    await navigator.clipboard.writeText(text);
    button.innerHTML = '<i class="bi bi-check-lg me-1"></i>已复制';
    setTimeout(() => {
      button.innerHTML = defaultLabel;
    }, 3000);
  } catch(err) {
    console.error(err);
    setStatus('复制失败，请手动复制。');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStatus();

  const payload = {
    name: document.getElementById('name').value.trim(),
    position: positionSelect.value.trim(),
    gender: document.getElementById('gender').value,
  };

  if (!payload.name || !payload.position || !payload.gender) {
    setStatus('请完整填写姓名、岗位和性别。');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>创建中...';

  try {
    const response = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      const message = typeof data.error === 'string'
        ? data.error
        : JSON.stringify(data.error || data);
      setStatus(message || '创建失败，请稍后重试。');
      return;
    }

    showResult(data);
    if (data.warning) {
      setStatus(data.warning, 'warning');
    } else {
      clearStatus();
    }
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-person-plus me-1"></i>创建禅道账号';
  }
});

copyAllBtn.addEventListener('click', () => {
  if (!latestResult) return;
  copyText(
    formatAllAccountInfo(latestResult),
    copyAllBtn,
    '<i class="bi bi-clipboard me-1"></i>复制全部信息',
  );
});

fillPositionOptions();
