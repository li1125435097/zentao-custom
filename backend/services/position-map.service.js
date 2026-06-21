'use strict';

const POSITION_MAP = {
  产品经理: ['po', 5],
  产品总监: ['pd', 7],
  项目经理: ['pm', 4],
  项目管理员: ['projectAdmin', 13],
  PM: ['pm', 4],
  PMP: ['pm', 4],
  开发: ['dev', 2],
  研发: ['dev', 2],
  研发总监: ['td', 6],
  高级开发: ['dev', 2],
  高级研发: ['dev', 2],
  工程师: ['dev', 2],
  前端: ['dev', 2],
  后端: ['dev', 2],
  全栈: ['dev', 2],
  iOS: ['dev', 2],
  Android: ['dev', 2],
  测试: ['qa', 3],
  测试总监: ['qd', 8],
  QA: ['qa', 3],
  质量: ['qa', 3],
  运维: ['ops', 10],
  OP: ['ops', 10],
  运营: ['ops', 10],
  管理: ['top', 9],
  高管: ['top', 9],
  CEO: ['top', 9],
  CTO: ['td', 6],
  CFO: ['top', 9],
  行政: ['others', 10],
  财务: ['finance', 10],
  HR: ['hr', 10],
  人事: ['hr', 10],
  实习生: ['limited', 12],
  访客: ['guest', 11],
};

const POSITION_OPTIONS = [
  '高级开发工程师',
  '前端工程师',
  '后端工程师',
  '全栈工程师',
  'iOS工程师',
  'Android工程师',
  '测试工程师',
  '产品经理',
  '产品总监',
  '项目经理',
  '项目管理员',
  '研发总监',
  '测试总监',
  '运维工程师',
  '运营',
  '人事',
  '行政',
  '财务',
  '实习生',
  '访客',
];

function mapPosition(position) {
  if (!position || !String(position).trim()) {
    return { role: 'dev', groupId: 2 };
  }

  const posLower = String(position).trim().toLowerCase();
  for (const [keyword, [role, groupId]] of Object.entries(POSITION_MAP)) {
    const keyLower = keyword.toLowerCase();
    if (posLower.includes(keyLower) || keyLower.includes(posLower)) {
      return { role, groupId };
    }
  }

  return { role: 'dev', groupId: 2 };
}

module.exports = { POSITION_MAP, POSITION_OPTIONS, mapPosition };
