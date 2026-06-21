const form = document.getElementById('applyForm');
const submitBtn = document.getElementById('submitBtn');
const statusBox = document.getElementById('status');
const positionSelect = document.getElementById('position');

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
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>提交中...';

  try {
    const response = await fetch('/api/pending-users/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      const message = typeof data.error === 'string'
        ? data.error
        : JSON.stringify(data.error || data);
      setStatus(message || '提交失败，请稍后重试。');
      return;
    }

    setStatus(data.message || '账号申请已提交，请等待管理员处理', 'success');
    form.reset();
    positionSelect.innerHTML = '<option value="">请选择岗位</option>';
    fillPositionOptions();
  } catch (error) {
    setStatus(`请求失败：${error.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-send me-1"></i>申请禅道账号';
  }
});

fillPositionOptions();
