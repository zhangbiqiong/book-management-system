# 图书管理系统 - 移动端

这是一个专为手机浏览器设计的图书管理系统前端界面，现已集成真实的API调用。

## 功能特性

### 🔐 用户认证
- 登录页面 (`login.html`)
- 用户名/密码验证
- JWT Token认证
- 登录状态保持
- 自动跳转到主页

### 📱 主界面 (`index.html`)
- 响应式设计，适配手机屏幕
- 顶部标题栏（显示用户信息）
- 中间内容区域（iframe）
- 底部导航菜单
- 实时认证状态检查

### 📚 图书查询 (`book.html`)
- 图书搜索功能
- 按分类和状态筛选
- 图书详情查看
- 搜索结果展示
- 分页功能
- 排序功能

### 📖 借阅记录 (`borrow.html`)
- 查看个人借阅历史
- 按状态筛选记录
- 图书续借功能
- 借阅详情查看
- 分页功能
- 排序功能

### ⚙️ 个人设置 (`setting.html`)
- 个人信息管理
- 用户角色显示
- 账户状态显示
- 密码修改
- 退出登录

## 技术栈

- **HTML5** - 页面结构
- **CSS3 + Less** - 样式设计
- **Bootstrap 5** - 响应式框架
- **Bootstrap Datetimepicker** - 日期/时间选择器
- **Alpine.js** - 轻量级交互框架
- **Axios** - HTTP 请求
- **Lodash** - 工具函数库
- **Bun** - 高性能 JavaScript 运行时（后端）
- **PostgreSQL 13** - 关系数据库
- **Redis 6** - 缓存与消息队列

## API集成

### 真实API调用
系统现已完全集成真实的API调用，包括：

- **认证API**: 登录、登出、获取当前用户信息
- **图书API**: 获取图书列表、搜索、详情查看
- **借阅API**: 获取借阅记录、续借、状态更新
- **用户API**: 获取用户信息、修改密码

### API特性
- JWT Token认证
- Cookie管理
- 自动错误处理
- 401状态码自动跳转登录
- 请求/响应拦截
- 统一的错误提示

## 文件结构

```
pwa/
├── front/
│   ├── css/
│   │   └── main.less          # 主样式文件
│   ├── js/
│   │   └── app.js            # 通用 JavaScript 工具和 API 服务
│   ├── login.html            # 登录页面
│   ├── index.html            # 主页面
│   ├── book.html             # 图书查询页面
│   ├── borrow.html           # 借阅记录页面
│   ├── setting.html          # 个人设置页面
│   └── README.md             # 前端说明文档
├── back/
│   ├── auth.js               # 认证模块
│   ├── user.js               # 用户管理
│   ├── book.js               # 图书管理
│   ├── borrow.js             # 借阅管理
│   ├── task.js               # 后台定时任务
│   ├── data-access.js        # 数据访问层
│   ├── utils.js              # 通用工具函数
│   └── common.js             # 公共模块
└── README.md                 # 项目说明文档
```

## 使用方法

### 1. 启动服务
确保后端服务正在运行，然后访问：
- 管理员后台：`https://localhost:3000`
- 移动端用户：`https://localhost:3001`

### 2. 登录系统
- 访问 `login.html`
- 使用测试账号登录：
  - 用户名：`admin`
  - 密码：`admin`

### 3. 使用功能
登录成功后会自动跳转到主页，可以通过底部导航切换不同功能：

- **图书** - 搜索和查看图书信息
- **借阅** - 查看个人借阅记录
- **设置** - 管理个人信息

## 设计特点

### 🎨 移动端优化
- 触摸友好的按钮大小
- 适配不同屏幕尺寸
- 流畅的页面切换动画
- 直观的图标和文字

### 🔄 交互体验
- 加载状态提示
- 错误信息反馈
- 表单验证
- 平滑的动画效果

### 📊 数据管理
- 本地存储用户信息
- 页面间数据传递
- 真实API调用
- 状态管理

## API调用示例

### 登录
```javascript
const response = await ApiService.login({
    username: 'admin',
    password: 'admin'
});
```

### 获取图书列表
```javascript
const response = await ApiService.getBooks({
    search: '红楼梦',
    page: 1,
    pageSize: 10,
    sortBy: 'title',
    sortOrder: 'asc'
});
```

### 获取借阅记录
```javascript
const response = await ApiService.getBorrows({
    status: 'borrowed',
    page: 1,
    pageSize: 10
});
```

### 修改密码
```javascript
const response = await ApiService.request('/change-password', {
    method: 'POST',
    data: {
        username: 'admin',
        oldPassword: 'oldpass',
        newPassword: 'newpass'
    }
});
```

## 开发说明

### 样式系统
使用Less预处理器，主要样式变量：
- `@primary-color` - 主色调
- `@secondary-color` - 次要色调
- `@success-color` - 成功状态
- `@danger-color` - 危险状态

### 组件结构
每个页面都使用Alpine.js进行状态管理，包含：
- 数据绑定
- 事件处理
- 计算属性
- 生命周期钩子

### 通信机制
- 使用localStorage存储用户数据
- 通过postMessage进行页面间通信
- iframe加载子页面内容
- 真实API调用

### API服务
`app.js` 中的 `ApiService` 提供：
- 统一的请求封装
- JWT Token管理
- Cookie处理
- 错误处理
- 认证状态检查

## 测试账号

- **用户名**: admin
- **密码**: admin

## 注意事项

1. **后端服务**: 确保后端服务运行在 `http://localhost:3000`
2. **CORS设置**: 后端需要允许前端域名的跨域请求
3. **HTTPS**: 建议使用HTTPS协议以确保安全性
4. **浏览器**: 支持现代浏览器，建议使用Chrome、Safari等主流浏览器
5. **移动端**: 建议在手机浏览器中访问以获得最佳体验

## 错误处理

系统提供完善的错误处理机制：

- **网络错误**: 自动重试和用户提示
- **认证错误**: 自动跳转到登录页面
- **权限错误**: 显示权限不足提示
- **数据错误**: 友好的错误信息显示

### Alpine.js 错误修复

系统已修复以下Alpine.js相关的错误：

- **初始化错误**: 修复了组件未完全初始化时访问`__x.$data`的问题
- **模态框数据传递**: 使用Alpine.js事件系统安全地传递模态框数据
- **组件生命周期**: 确保组件完全初始化后再执行相关操作

#### 修复的问题
1. `login.html:164` - 组件初始化错误
2. 模态框数据传递错误
3. Alpine.js组件访问时序问题

#### 解决方案
- 使用`Alpine.nextTick()`确保组件完全初始化
- 使用`@event.window`事件系统传递数据
- 添加安全检查防止访问未初始化的组件

## 后续开发

- [x] 连接真实后端API
- [x] 添加JWT认证
- [x] 实现错误处理
- [x] 添加加载状态
- [ ] 添加图书预约功能
- [ ] 实现消息通知系统
- [ ] 优化离线体验
- [ ] 添加更多个性化设置
- [ ] 实现WebSocket实时通信 