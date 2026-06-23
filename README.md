# zentao-custom

禅道（开源版 21.7）用户管理服务。前后端分离目录，标准 MVC 结构。

- **后端**：Koa + Router + Controller + Service
- **前端**：Bootstrap 5 + 左侧菜单布局

## 项目结构

```
backend/
  app.js                 # 服务入口
  config/                # 配置
  routes/                # 路由
  controllers/           # 控制器
  services/              # 业务逻辑 / 禅道 API
  middleware/            # 中间件
  logs/                  # API 日志（自动生成）

frontend/
  pages/users/create.html   # 用户管理 > 新增
  assets/css/                 # 样式
  assets/js/                  # 脚本
  models/positions.js         # 岗位数据
```

## 功能

- 左侧菜单：**用户管理 → 新增**
- 填写姓名、岗位、性别，自动创建禅道账号
- 返回网址、账号、密码

## 快速开始

```bash
cp .env.example .env
# 编辑 ZENTAO_ADMIN_PASSWORD

npm install
npm start
```

访问：

```
http://localhost:3000/pages/users/create.html
```

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/users/positions` | 岗位列表 |
| POST | `/api/users/register` | 新增用户 |

请求示例：

```json
{
  "name": "张三",
  "position": "高级开发工程师",
  "gender": "男"
}
```

## 日志

禅道 API 及本地 API 的请求/响应写入 `backend/logs/api.log`（密码、Token 自动脱敏）。

## 说明

- 创建用户时 v1 API 的 `group` 传字符串，创建后通过 v2 API 写入权限组数组
- 参考 Python 版 skill 见 `zentao-users/` 目录

## 访问地址
http://localhost:3000/api/login?token=lijinke_QniLQ2OYNB2X000vnuOR
http://localhost:3000/api/login?token=lisi_OHq4CfMn5wrpSQp2CCg5
