# 图书管理系统

一个使用 Bun、Alpine.js、Bootstrap 5 构建的现代化图书管理系统，支持用户管理、图书管理、借阅管理、实时通知等功能。采用响应式设计和声明式编程范式，提供完整的图书馆管理解决方案。

## ✨ 核心特性

### 🔐 用户认证系统
- ✅ **用户登录** - 基于JWT的安全登录认证
- ✅ **用户注册** - 新用户注册功能，支持用户名唯一性验证
- ✅ **修改密码** - 支持旧密码验证的安全密码修改
- ✅ **用户登出** - 安全的会话终止和token黑名单机制
- ✅ **权限控制** - 基于角色的访问控制（admin/user）

### 📚 图书管理
- ✅ **图书CRUD** - 完整的图书增删改查操作
- ✅ **智能搜索** - 支持书名、作者、出版社的模糊搜索
- ✅ **分页显示** - 高效的分页加载，支持自定义每页显示数量
- ✅ **表单验证** - 完整的前后端数据验证
- ✅ **实时更新** - 通过WebSocket实现多用户实时数据同步

### 👥 用户管理
- ✅ **用户CRUD** - 完整的用户增删改查操作
- ✅ **角色管理** - 支持admin和user角色管理
- ✅ **状态管理** - 用户启用/禁用状态控制
- ✅ **批量操作** - 支持批量用户管理操作

### 📖 借阅管理
- ✅ **借阅记录** - 完整的借阅记录管理
- ✅ **状态追踪** - 智能的借阅状态计算（正常/逾期/已归还）
- ✅ **日期管理** - 支持借阅日期和归还日期管理
- ✅ **逾期提醒** - 自动计算和显示逾期状态

### 📊 数据统计
- ✅ **借阅统计** - 全面的借阅数据统计分析
- ✅ **状态分布** - 借阅状态分布饼图展示
- ✅ **趋势分析** - 最近30天借阅趋势线图
- ✅ **可视化展示** - 使用Apache ECharts实现数据可视化

### 🔄 实时通信
- ✅ **WebSocket通知** - 实时推送系统通知
- ✅ **多用户同步** - 多用户操作实时同步
- ✅ **连接管理** - 智能的连接状态管理

### 🖥️ 任务监控
- ✅ **系统监控** - 实时系统状态监控
- ✅ **任务管理** - 后台任务启停控制
- ✅ **状态展示** - 可视化的任务状态展示

## 🛠️ 技术栈

### 后端技术
- **运行时**: Bun (JavaScript运行时)
- **HTTP服务**: Bun原生HTTP服务器
- **WebSocket**: Bun原生WebSocket支持
- **数据库**: PostgreSQL (主数据库)
- **缓存**: Redis (数据缓存)
- **数据库层**: Bun SQL (内置PostgreSQL驱动)
- **身份认证**: JWT (JSON Web Token)
- **密码加密**: Bun.password (内置密码加密)

### 前端技术
- **HTML5**: 语义化结构，支持现代浏览器
- **CSS框架**: Bootstrap 5.3.2 (响应式UI框架)
- **样式预处理**: Less (通过jsDelivr CDN)
- **JavaScript框架**: Alpine.js 3.x (轻量级响应式框架)
- **HTTP客户端**: Axios (通过jsDelivr CDN)
- **工具库**: Lodash (实用工具函数)
- **日期选择**: Flatpickr (日期时间选择器)
- **数据可视化**: Apache ECharts (图表库)

### 开发工具
- **包管理**: Bun (快速包管理器)
- **热重载**: Bun --watch (开发模式自动重启)
- **版本控制**: Git

## 🏗️ 架构特色

### Bun SQL 数据库层
本项目采用 Bun 内置的 SQL 支持，具有以下优势：

- **🚀 高性能**: 原生 PostgreSQL 协议支持，比第三方库更快
- **🛡️ 安全**: 内置 SQL 注入防护，使用 tagged template literals
- **🔧 简单**: 无需额外配置，自动连接池管理
- **💡 现代**: 支持 Promise 和 async/await，tagged template 语法优雅

```javascript
// 使用示例
const users = await sql`SELECT * FROM users WHERE active = ${true}`;
const user = await sql`INSERT INTO users ${sql(userData)} RETURNING *`;
```

### 数据访问层设计
- **统一接口**: DataAccess 类提供统一的数据访问方法
- **缓存机制**: Redis 缓存提高查询性能
- **字段映射**: 自动处理数据库字段名与前端驼峰命名的转换
- **事务支持**: 支持复杂的事务操作和回滚

## 🚀 快速开始

### 环境要求

- **Bun**: >= 1.0.0
- **PostgreSQL**: >= 12.0
- **Redis**: >= 6.0
- **Node.js**: >= 18.0 (可选，如果需要使用npm工具)

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd book-management-system
```

2. **配置数据库**
```bash
# 安装 PostgreSQL 和 Redis (Ubuntu/Debian)
sudo apt update
sudo apt install -y postgresql postgresql-contrib redis-server

# 启动服务
sudo systemctl start postgresql
sudo systemctl start redis-server

# 创建数据库用户和数据库
sudo -u postgres psql
CREATE USER postgres WITH PASSWORD 'your_new_password';
CREATE DATABASE book_management OWNER postgres;
GRANT ALL PRIVILEGES ON DATABASE book_management TO postgres;
\q
```

3. **配置环境变量**
```bash
# 数据库连接配置（已内置，如需修改请编辑 back-js/database.js）
DATABASE_URL=postgresql://postgres:your_new_password@localhost:5432/book_management

# Redis配置（默认本地连接，端口6379）
```

4. **安装依赖**
```bash
bun install
```

5. **启动服务**
```bash
# 开发模式（推荐，支持热重载）
bun run dev

# 生产模式
bun run start
```

6. **访问系统**
```
浏览器访问: http://localhost:3000
默认管理员账户: admin / admin123
```

### 数据库初始化

系统启动时会自动创建所需的数据表结构：
- `users` - 用户表
- `books` - 图书表  
- `borrows` - 借阅记录表

首次启动后会自动创建默认管理员账户。

### 项目结构

```
book-management-system/
├── server.js              # 主服务器文件
├── package.json           # 项目配置文件
├── bun.lock              # 依赖锁定文件
├── .gitignore           # Git忽略文件
├── README.md            # 项目说明文档
├── UI.md                # 界面设计文档
├── API.md               # API接口文档
├── html/                # 前端页面目录
│   ├── index.html       # 主页面
│   ├── login.html       # 登录页面
│   ├── book.html        # 图书管理页面
│   ├── user.html        # 用户管理页面
│   ├── borrow.html      # 借阅管理页面
│   ├── statistics.html  # 数据统计页面
│   ├── monitor.html     # 任务监控页面
│   ├── common.js        # 公共JavaScript函数
│   └── common.less      # 公共样式文件
├── back-js/             # 后端逻辑目录
│   ├── config.js        # 配置文件
│   ├── database.js      # 数据库连接配置
│   ├── data-access.js   # 数据访问层（Bun SQL）
│   ├── routes.js        # 路由处理
│   ├── auth.js          # 认证逻辑
│   ├── user.js          # 用户管理
│   ├── book.js          # 图书管理
│   ├── borrow.js        # 借阅管理
│   ├── statistics.js    # 数据统计
│   ├── task.js          # 任务管理
│   ├── websocket.js     # WebSocket处理
│   ├── utils.js         # 工具函数
│   ├── password.js      # 密码处理
│   └── common.js        # 公共函数
└── assert/              # 静态资源目录
```

## 📋 项目配置

### 服务器配置
```javascript
// back-js/config.js
export const SERVER_PORT = 3000;              // 服务器端口
export const JWT_SECRET = "your_secret_key";  // JWT密钥
export const JWT_EXPIRES_IN = 60 * 60 * 24;   // Token过期时间(24小时)
export const TASK_UPDATE_INTERVAL = 60 * 1000; // 任务更新间隔(60秒)
```

### 启动脚本
```json
{
  "scripts": {
    "start": "bun run server.js",     // 生产模式
    "dev": "bun --watch server.js"    // 开发模式（热重载）
  }
}
```

## 🎯 使用指南

### 1. 用户管理

1. **登录系统**: 使用默认管理员账户或已注册用户登录
2. **用户注册**: 在登录页面切换到注册表单
3. **密码修改**: 在登录页面选择修改密码选项

### 2. 图书管理

1. **添加图书**: 点击"添加图书"按钮，填写图书信息
2. **搜索图书**: 使用搜索框进行书名、作者、出版社搜索
3. **编辑图书**: 点击图书列表中的编辑按钮
4. **删除图书**: 点击图书列表中的删除按钮

### 3. 借阅管理

1. **创建借阅**: 选择用户和图书，设置借阅日期
2. **归还图书**: 在借阅记录中点击归还按钮
3. **查看状态**: 系统自动计算借阅状态（正常/逾期/已归还）

### 4. 数据统计

1. **访问统计页面**: 查看借阅数据概览
2. **查看图表**: 借阅状态分布和趋势分析
3. **导出数据**: 可以通过API获取统计数据

## 🔍 API接口

系统提供完整的RESTful API接口，详见 [API.md](API.md) 文档。

### 主要接口概览

- **认证接口**: `/api/login`, `/api/register`, `/api/current-user`
- **图书接口**: `/api/books` (GET/POST/PUT/DELETE)
- **用户接口**: `/api/users` (GET/POST/PUT/DELETE)
- **借阅接口**: `/api/borrows` (GET/POST/PUT/DELETE)
- **统计接口**: `/api/statistics/borrow`
- **任务接口**: `/api/task/status`, `/api/task/start`, `/api/task/stop`
- **WebSocket**: `/ws` (实时通知)

## 🎨 界面设计

系统采用现代化响应式设计，详见 [UI.md](UI.md) 文档。

### 设计特点

- **响应式布局**: 适配桌面、平板、手机各种设备
- **现代化UI**: 使用Bootstrap 5组件和渐变色设计
- **用户友好**: 直观的操作界面和清晰的信息展示
- **实时反馈**: WebSocket实时通知和状态更新

## 🧪 开发指南

### 1. 开发环境设置

```bash
# 启动开发服务器
bun run dev

# 检查进程状态
lsof -ti:3000

# 重启服务器（如需要）
lsof -ti:3000 | xargs kill -9 && sleep 2 && bun run dev
```

### 2. 代码结构说明

- **HTML文件**: 放在 `html/` 目录下，直接编写CSS和JavaScript
- **后端逻辑**: 除了 `server.js` 外，其他后端代码放在 `back-js/` 目录下
- **静态资源**: 放在 `assert/` 目录下

### 3. 开发注意事项

- **热重载**: `bun run dev` 已监听文件变化，无需手动重启
- **自动执行**: MCP工具和临时测试文件可以自动执行
- **命令行工具**: 可使用 `sudo apt install -y` 安装需要的工具

### 4. 技术特点

- **声明式编程**: 使用Alpine.js实现响应式数据绑定
- **模块化设计**: 前后端代码分离，功能模块化
- **性能优化**: 使用缓存、分页、WebSocket等技术优化性能
- **密码安全**: 使用Bun.password进行密码加密

## 🔧 运维管理

### 1. 服务管理

```bash
# 查看端口占用
lsof -ti:3000

# 停止服务
lsof -ti:3000 | xargs kill -9

# 启动服务
bun run dev
```

### 2. 任务监控

访问 `/monitor.html` 页面可以：
- 查看后台任务状态
- 手动启动/停止任务
- 监控系统运行状态

### 3. 数据备份

系统使用内存存储，重启后数据会重置。如需持久化，建议：
- 定期导出数据
- 实现数据库存储
- 使用文件系统存储

## 📝 许可证

MIT License

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📞 技术支持

如有问题或建议，请通过以下方式联系：

- 创建 Issue
- 发送 Pull Request
- 查看文档：[UI.md](UI.md) | [API.md](API.md)

---

**最后更新**: 2024年12月

**版本**: 1.0.0 