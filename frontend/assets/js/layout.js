const MENU_CONFIG = [
  {
    id: 'users',
    title: '用户管理',
    icon: 'bi-people',
    children: [
      {
        id: 'create',
        title: '新增',
        href: '/pages/users/create.html',
      },
      {
        id: 'batch-create',
        title: '批量新增',
        href: '/pages/users/batch-create.html',
      },
      {
        id: 'delete',
        title: '删除',
        href: '/pages/users/delete.html',
      },
      {
        id: 'reset-password',
        title: '修改密码',
        href: '/pages/users/reset-password.html',
      },
    ],
  },
  {
    id: 'permissions',
    title: '权限管理',
    icon: 'bi-shield-lock',
    children: [
      {
        id: 'token-list',
        title: 'Token 管理',
        href: '/pages/permissions/token-list.html',
      },
    ],
  },
  {
    id: 'internal',
    title: '内部用户',
    icon: 'bi-person-badge',
    children: [
      {
        id: 'pending-list',
        title: '账号管理',
        href: '/pages/internal/pending-list.html',
      },
      {
        id: 'apply-account',
        title: '申请账号',
        href: '/pages/internal/apply-account.html',
      },
      {
        id: 'fetch-user',
        title: '用户获取',
        href: '/pages/internal/fetch-user.html',
      },
    ],
  },
];

function getMenuConfigForRole(role) {
  if (role === 'super') {
    return MENU_CONFIG;
  }
  if (role === 'admin') {
    return MENU_CONFIG.filter((section) => section.id !== 'permissions');
  }
  return MENU_CONFIG
    .filter((section) => section.id === 'internal')
    .map((section) => ({
      ...section,
      children: section.children.filter((item) => (
        item.id === 'apply-account' || item.id === 'fetch-user'
      )),
    }));
}

function renderSidebar(activeSection, activePage, role = 'guest') {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const menuConfig = getMenuConfigForRole(role);
  const menuHtml = menuConfig.map((section) => {
    const isOpen = section.id === activeSection;
    const childrenHtml = (section.children || []).map((item) => {
      const active = isOpen && item.id === activePage ? ' active' : '';
      return `
        <a class="nav-link sidebar-subitem${active}" href="${item.href}">
          ${item.title}
        </a>
      `;
    }).join('');

    return `
      <div class="sidebar-section">
        <button class="sidebar-section-toggle${isOpen ? '' : ' collapsed'}" type="button"
          data-bs-toggle="collapse" data-bs-target="#menu-${section.id}" aria-expanded="${isOpen}">
          <i class="bi ${section.icon} me-2"></i>${section.title}
        </button>
        <div class="collapse${isOpen ? ' show' : ''}" id="menu-${section.id}">
          <nav class="nav flex-column ms-3 mb-2">${childrenHtml}</nav>
        </div>
      </div>
    `;
  }).join('');

  sidebar.innerHTML = `
    <div class="sidebar-brand px-3 py-3 border-bottom border-secondary">
      <div class="d-flex align-items-center gap-2">
        <span class="brand-icon rounded-circle d-inline-flex align-items-center justify-content-center">禅</span>
        <div>
          <div class="fw-semibold">禅道管理</div>
          <small class="text-secondary">ZenTao 21.7</small>
        </div>
      </div>
    </div>
    <div class="sidebar-menu p-2">${menuHtml}</div>
  `;
}

async function initLayout({ section, page, title }) {
  let role = 'guest';
  try {
    const response = await fetch('/api/session');
    const result = await response.json();
    if (result.ok && result.role) {
      role = result.role;
    }
  } catch {
    // 保持游客默认权限
  }

  renderSidebar(section, page, role);
  if (title) {
    document.title = `${title} - 禅道管理`;
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    if (pageTitle) pageTitle.textContent = title;
    if (pageSubtitle && window.PAGE_SUBTITLE) {
      pageSubtitle.textContent = window.PAGE_SUBTITLE;
    }
  }
}

window.initLayout = initLayout;
