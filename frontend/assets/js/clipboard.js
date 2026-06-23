'use strict';

function resolveContainer(container) {
  if (container instanceof Element) {
    return container;
  }
  if (typeof container === 'string') {
    return document.querySelector(container);
  }
  return document.body;
}

function copyWithExecCommand(text, container) {
  const mount = resolveContainer(container);
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:2em',
    'height:2em',
    'padding:0',
    'border:none',
    'outline:none',
    'box-shadow:none',
    'background:transparent',
    'opacity:0',
  ].join(';');

  mount.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied = false;
  const onCopy = (event) => {
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
    copied = true;
  };

  document.addEventListener('copy', onCopy);
  try {
    document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    document.removeEventListener('copy', onCopy);
    mount.removeChild(textarea);
  }

  return copied;
}

async function copyToClipboard(text, container) {
  if (!text) {
    return false;
  }

  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy copy
  }

  return copyWithExecCommand(text, container);
}

async function copyText(text, button, defaultLabel, container, options = {}) {
  const resetMs = options.resetMs ?? 3000;
  const copiedLabel = options.copiedLabel ?? '<i class="bi bi-check-lg me-1"></i>已复制';
  const failedLabel = options.failedLabel ?? '<i class="bi bi-x-lg me-1"></i>复制失败';

  const markCopied = () => {
    if (!button) return;
    button.innerHTML = copiedLabel;
    setTimeout(() => {
      button.innerHTML = defaultLabel;
    }, resetMs);
  };

  const markFailed = () => {
    if (!button) return;
    button.innerHTML = failedLabel;
    setTimeout(() => {
      button.innerHTML = defaultLabel;
    }, resetMs);
  };

  if (!text) {
    markFailed();
    return false;
  }

  if (await copyToClipboard(text, container)) {
    markCopied();
    return true;
  }

  markFailed();
  return false;
}

window.ClipboardUtil = {
  copyToClipboard,
  copyText,
  copyWithExecCommand,
};
