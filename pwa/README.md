# 图书管理系统 - PWA版本

## 项目简介

这是一个基于现代Web技术栈构建的图书管理系统，采用PWA（Progressive Web App）架构，提供响应式设计和离线功能。

## 技术栈

- **前端**: HTML5 + CSS3 + JavaScript + Bootstrap 5.3.2 + Alpine.js 3.x
- **后端**: Bun (JavaScript Runtime)
- **数据库**: PostgreSQL
- **通信**: WebSocket (实时通知)
- **部署**: HTTPS + 自签名证书

## 主要功能

- ✅ **用户管理**: 用户注册、登录、权限控制
- ✅ **图书管理**: 图书增删改查、库存管理
- ✅ **借阅管理**: 借阅记录、归还管理、逾期提醒
- ✅ **实时通知**: WebSocket实时消息推送
- ✅ **响应式设计**: 支持PC和移动设备
- ✅ **PWA特性**: 离线缓存、安装到桌面
- ✅ **数据库升级**: 从内存存储升级到 PostgreSQL 架构
- ✅ **数据持久化**: 完整的数据库存储方案
- ✅ **权限控制**: 基于角色的访问控制
- ✅ **搜索功能**: 支持模糊搜索和分页
- ✅ **统计功能**: 借阅统计、图书统计
- ✅ **后台任务**: 自动状态更新任务

## 项目结构

```
pwa/
├── back/                 # 后端代码
│   ├── auth.js          # 用户认证
│   ├── book.js          # 图书管理
│   ├── borrow.js        # 借阅管理
│   ├── user.js          # 用户管理
│   ├── common.js        # 公共工具
│   ├── data-access.js   # 数据访问层
│   ├── database.js      # 数据库初始化
│   ├── routes.js        # 路由处理
│   ├── utils.js         # 工具函数
│   ├── websocket.js     # WebSocket处理
│   ├── task.js          # 后台任务
│   ├── statistics.js    # 统计功能
│   ├── password.js      # 密码处理
│   └── config.js        # 配置文件
├── front/               # 前端代码
│   ├── component/       # 组件
│   ├── page/           # 页面
│   └── static/         # 静态资源
├── server-pwa.js       # 服务器入口
├── package.json        # 项目配置
└── README.md          # 项目说明
```

## 快速开始

### 环境要求

- **Node.js**: 18.0+
- **Bun**: 1.0+
- **PostgreSQL**: 12+

### 安装依赖

```bash
cd pwa
bun install
```

### 数据库配置

1. 确保PostgreSQL服务正在运行
2. 创建数据库：`book_management`
3. 运行数据库初始化脚本

### 启动服务

```bash
# 开发模式启动
bun run dev-pwa

# 或者直接启动
bun run server-pwa.js
```

### 访问应用

- **PWA应用**: https://localhost:3001
- **管理后台**: https://localhost:3000 (management项目)

## 功能特性

### 用户管理
- 用户注册、登录、注销
- 密码加密存储
- 基于角色的权限控制
- 用户状态管理

### 图书管理
- 图书信息的增删改查
- 库存管理
- 图书分类
- 搜索和分页

### 借阅管理
- 借阅记录创建
- 归还管理
- 逾期提醒
- 借阅历史查询

### 实时功能
- WebSocket实时通知
- 借阅状态实时更新
- 多用户操作同步

### 统计功能
- 借阅统计图表
- 图书库存统计
- 归还统计

## 开发说明

### 代码规范
- 使用ES6+语法
- 遵循命名规范
- 模块化设计
- 错误处理完善

### 数据库设计
- 用户表 (users)
- 图书表 (books)
- 借阅表 (borrows)
- 软删除支持

### 安全特性
- HTTPS加密传输
- JWT身份验证
- 密码加密存储
- 权限验证

## 部署说明

### 生产环境
1. 配置环境变量
2. 设置HTTPS证书
3. 配置数据库连接
4. 启动服务

### 性能优化
- 数据库索引优化
- 静态资源缓存
- 代码压缩
- CDN加速

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交代码
4. 创建Pull Request

## 许可证

MIT License 