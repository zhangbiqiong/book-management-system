# 图书管理系统 API 文档

## 概述

图书管理系统提供完整的用户管理、图书管理、借阅管理功能，包括用户认证、图书CRUD操作、借阅管理、实时通知等。所有API都返回JSON格式的响应。系统采用 Alpine.js 3.x 作为前端框架，实现响应式数据绑定和声明式编程。

**基础URL**: `http://localhost:3000`

**认证方式**: JWT Token (通过Cookie传递)

**前端框架**: Alpine.js 3.x

**实时通信**: WebSocket

**内容类型**: `application/json`

**密码加密**: Bun.password (内置密码加密)

## 🏗️ 数据库架构

### 技术栈
- **数据库**: PostgreSQL 12+
- **缓存**: Redis 6+
- **数据库驱动**: Bun SQL (内置原生支持)
- **连接池**: 自动管理，最大连接数 10

### 数据表结构

#### 用户表 (users)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  status VARCHAR(20) NOT NULL DEFAULT 'enabled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 图书表 (books)
```sql
CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(100) NOT NULL,
  publisher VARCHAR(100) NOT NULL,
  isbn VARCHAR(20) UNIQUE NOT NULL,
  publish_date DATE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  category VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 借阅记录表 (borrows)
```sql
CREATE TABLE borrows (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  book_title VARCHAR(200) NOT NULL,
  borrower_name VARCHAR(50) NOT NULL,
  borrow_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'borrowed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 数据访问层特性
- **Redis缓存**: 5分钟TTL，自动缓存管理
- **字段映射**: 数据库下划线命名 ↔ 前端驼峰命名自动转换
- **分页查询**: 支持搜索、排序、分页
- **事务支持**: 复杂操作的事务保证
- **连接池**: 自动管理数据库连接，优化性能

---

## 🔐 认证相关 API

### 1. 获取当前用户信息

**接口地址**: `GET /api/current-user`

**功能描述**: 获取当前登录用户的详细信息

**认证要求**: 需要有效的JWT Token

**请求参数**: 无

**请求示例**:
```bash
curl -X GET http://localhost:3000/api/current-user \
  -H "Cookie: token=<jwt_token>"
```

**成功响应**:
```json
{
  "success": true,
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "未登录"
}
```

**状态码**:
- `200` - 成功
- `401` - 未授权访问
- `500` - 服务器错误

---

### 2. 用户登录

**接口地址**: `POST /api/login`

**功能描述**: 用户登录认证，成功后返回JWT Token

**认证要求**: 无

**请求参数**:
```json
{
  "username": "string",  // 必填，用户名
  "password": "string"   // 必填，密码
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**成功响应**:
```json
{
  "success": true,
  "message": "登录成功"
}
```

**Set-Cookie 头部**:
```
Set-Cookie: token=<jwt_token>; Path=/; SameSite=Lax
```

**错误响应**:
```json
{
  "success": false,
  "message": "用户名和密码不能为空"
}
```

```json
{
  "success": false,
  "message": "用户名或密码错误"
}
```

**状态码**:
- `200` - 成功
- `400` - 请求参数错误
- `401` - 用户名或密码错误
- `500` - 服务器错误

---

### 3. 用户注册

**接口地址**: `POST /api/register`

**功能描述**: 注册新用户账户

**认证要求**: 无

**请求参数**:
```json
{
  "username": "string",        // 必填，用户名，3-20字符
  "password": "string",        // 必填，密码，6位以上
  "confirmPassword": "string", // 必填，确认密码，必须与密码一致
  "role": "string"            // 可选，用户角色，默认为"user"
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "confirmPassword": "password123",
    "role": "user"
  }'
```

**成功响应**:
```json
{
  "success": true,
  "message": "注册成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "用户名、密码和确认密码不能为空"
}
```

```json
{
  "success": false,
  "message": "两次输入的密码不一致"
}
```

```json
{
  "success": false,
  "message": "用户名已存在"
}
```

**状态码**:
- `200` - 成功
- `400` - 请求参数错误
- `409` - 用户名已存在
- `500` - 服务器错误

---

### 4. 修改密码

**接口地址**: `POST /api/change-password`

**功能描述**: 修改用户密码

**认证要求**: 无（通过用户名和旧密码验证）

**请求参数**:
```json
{
  "username": "string",     // 必填，用户名
  "oldPassword": "string",  // 必填，旧密码
  "newPassword": "string"   // 必填，新密码
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/change-password \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "oldPassword": "oldpass123",
    "newPassword": "newpass123"
  }'
```

**成功响应**:
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "用户名、旧密码和新密码不能为空"
}
```

```json
{
  "success": false,
  "message": "用户不存在或旧密码错误"
}
```

**状态码**:
- `200` - 成功
- `400` - 请求参数错误
- `401` - 旧密码错误
- `404` - 用户不存在
- `500` - 服务器错误

---

### 5. 用户登出

**接口地址**: `POST /api/logout`

**功能描述**: 用户登出，将JWT Token加入黑名单

**认证要求**: 需要有效的JWT Token

**请求参数**: 无

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/logout \
  -H "Cookie: token=<jwt_token>"
```

**成功响应**:
```json
{
  "success": true,
  "message": "登出成功"
}
```

**Set-Cookie 头部**:
```
Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

**错误响应**:
```json
{
  "success": false,
  "message": "未登录"
}
```

**状态码**:
- `200` - 成功
- `401` - 未授权访问
- `500` - 服务器错误

---

## 📚 图书管理 API

### 1. 获取图书列表

**接口地址**: `GET /api/books`

**功能描述**: 获取图书列表，支持搜索和分页

**认证要求**: 需要有效的JWT Token

**查询参数**:
- `search` (可选): 搜索关键词，支持书名、作者、出版社模糊搜索
- `page` (可选): 页码，默认为1
- `pageSize` (可选): 每页数量，默认为5

**请求示例**:
```bash
curl -X GET "http://localhost:3000/api/books?search=小说&page=1&pageSize=10" \
  -H "Cookie: token=<jwt_token>"
```

**成功响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "title": "红楼梦",
      "author": "曹雪芹",
      "publisher": "人民文学出版社",
      "publishDate": "2020-01-01",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "未授权访问"
}
```

**状态码**:
- `200` - 成功
- `401` - 未授权访问
- `500` - 服务器错误

---

### 2. 创建图书

**接口地址**: `POST /api/books`

**功能描述**: 添加新图书

**认证要求**: 需要有效的JWT Token

**请求参数**:
```json
{
  "title": "string",       // 必填，图书标题
  "author": "string",      // 必填，作者
  "publisher": "string",   // 必填，出版社
  "publishDate": "string"  // 必填，出版日期，格式: YYYY-MM-DD
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<jwt_token>" \
  -d '{
    "title": "西游记",
    "author": "吴承恩",
    "publisher": "人民文学出版社",
    "publishDate": "2020-01-01"
  }'
```

**成功响应**:
```json
{
  "success": true,
  "message": "图书添加成功",
  "data": {
    "id": "2",
    "title": "西游记",
    "author": "吴承恩",
    "publisher": "人民文学出版社",
    "publishDate": "2020-01-01",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "所有字段都必须填写"
}
```

**状态码**:
- `200` - 成功
- `400` - 请求参数错误
- `401` - 未授权访问
- `500` - 服务器错误

---

### 3. 更新图书

**接口地址**: `PUT /api/books/:id`

**功能描述**: 更新指定图书信息

**认证要求**: 需要有效的JWT Token

**路径参数**:
- `id`: 图书ID

**请求参数**:
```json
{
  "title": "string",       // 必填，图书标题
  "author": "string",      // 必填，作者
  "publisher": "string",   // 必填，出版社
  "publishDate": "string"  // 必填，出版日期，格式: YYYY-MM-DD
}
```

**请求示例**:
```bash
curl -X PUT http://localhost:3000/api/books/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<jwt_token>" \
  -d '{
    "title": "红楼梦（修订版）",
    "author": "曹雪芹",
    "publisher": "人民文学出版社",
    "publishDate": "2021-01-01"
  }'
```

**成功响应**:
```json
{
  "success": true,
  "message": "图书更新成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "图书不存在"
}
```

```json
{
  "success": false,
  "message": "所有字段都必须填写"
}
```

**状态码**:
- `200` - 成功
- `400` - 请求参数错误
- `404` - 图书不存在
- `401` - 未授权访问
- `500` - 服务器错误

---

### 4. 删除图书

**接口地址**: `DELETE /api/books/:id`

**功能描述**: 删除指定图书

**认证要求**: 需要有效的JWT Token

**路径参数**:
- `id`: 图书ID

**请求示例**:
```bash
curl -X DELETE http://localhost:3000/api/books/1 \
  -H "Cookie: token=<jwt_token>"
```

**成功响应**:
```json
{
  "success": true,
  "message": "图书删除成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "图书不存在"
}
```

**状态码**:
- `200` - 成功
- `404` - 图书不存在
- `401` - 未授权访问
- `500` - 服务器错误

---

## 👥 用户管理 API

### 1. 获取用户列表

**接口地址**: `GET /api/users`

**功能描述**: 获取用户列表，支持搜索和分页

**认证要求**: 需要有效的JWT Token

**查询参数**:
- `search` (可选): 搜索关键词，支持用户名、角色模糊搜索
- `page` (可选): 页码，默认为1
- `pageSize` (可选): 每页数量，默认为5

**请求示例**:
```bash
curl -X GET "http://localhost:3000/api/users?search=admin&page=1&pageSize=10" \
  -H "Cookie: token=<jwt_token>"
```

**成功响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "admin",
      "username": "admin",
      "role": "admin",
      "status": "enabled",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

**状态码**:
- `200` - 成功
- `401` - 未授权访问
- `500` - 服务器错误

---

### 2. 创建用户

**接口地址**: `POST /api/users`

**功能描述**: 创建新用户（管理员功能）

**认证要求**: 需要有效的JWT Token

**请求参数**:
```json
{
  "username": "string",  // 必填，用户名
  "password": "string",  // 必填，密码
  "role": "string",      // 必填，用户角色（admin/user）
  "status": "string"     // 必填，用户状态（enabled/disabled）
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<jwt_token>" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "role": "user",
    "status": "enabled"
  }'
```

**成功响应**:
```json
{
  "success": true,
  "message": "用户创建成功",
  "data": {
    "id": "newuser",
    "username": "newuser",
    "role": "user",
    "status": "enabled",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "所有字段都必须填写"
}
```

```json
{
  "success": false,
  "message": "用户名已存在"
}
```

**状态码**:
- `200` - 成功
- `400` - 请求参数错误
- `409` - 用户名已存在
- `401` - 未授权访问
- `500` - 服务器错误

---

### 3. 更新用户

**接口地址**: `PUT /api/users/:id`

**功能描述**: 更新指定用户信息

**认证要求**: 需要有效的JWT Token

**路径参数**:
- `id`: 用户ID

**请求参数**:
```json
{
  "password": "string",  // 可选，新密码
  "role": "string",      // 可选，用户角色
  "status": "string"     // 可选，用户状态
}
```

**请求示例**:
```bash
curl -X PUT http://localhost:3000/api/users/testuser \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<jwt_token>" \
  -d '{
    "role": "admin",
    "status": "enabled"
  }'
```

**成功响应**:
```json
{
  "success": true,
  "message": "用户更新成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "用户不存在"
}
```

**状态码**:
- `200` - 成功
- `404` - 用户不存在
- `401` - 未授权访问
- `500` - 服务器错误

---

### 4. 删除用户

**接口地址**: `DELETE /api/users/:id`

**功能描述**: 删除指定用户

**认证要求**: 需要有效的JWT Token

**路径参数**:
- `id`: 用户ID

**请求示例**:
```bash
curl -X DELETE http://localhost:3000/api/users/testuser \
  -H "Cookie: token=<jwt_token>"
```

**成功响应**:
```json
{
  "success": true,
  "message": "用户删除成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "用户不存在"
}
```

**状态码**:
- `200` - 成功
- `404` - 用户不存在
- `401` - 未授权访问
- `500` - 服务器错误

---

## 📖 借阅管理 API

### 1. 获取借阅列表

**接口地址**: `GET /api/borrows`

**功能描述**: 获取借阅记录列表，支持搜索和分页

**认证要求**: 需要有效的JWT Token

**查询参数**:
- `search` (可选): 搜索关键词，支持图书名、借阅者模糊搜索
- `page` (可选): 页码，默认为1
- `pageSize` (可选): 每页数量，默认为5

**请求示例**:
```bash
curl -X GET "http://localhost:3000/api/borrows?search=红楼梦&page=1&pageSize=10" \
  -H "Cookie: token=<jwt_token>"
```

**成功响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "bookTitle": "红楼梦",
      "borrower": "张三",
      "borrowDate": "2024-01-01",
      "returnDate": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

**状态码**:
- `200` - 成功
- `401` - 未授权访问
- `500` - 服务器错误

---

### 2. 创建借阅记录

**接口地址**: `POST /api/borrows`

**功能描述**: 创建新的借阅记录

**认证要求**: 需要有效的JWT Token

**请求参数**:
```json
{
  "bookTitle": "string",    // 必填，图书标题
  "borrower": "string",     // 必填，借阅者姓名
  "borrowDate": "string",   // 必填，借阅日期，格式: YYYY-MM-DD
  "returnDate": "string"    // 可选，归还日期，格式: YYYY-MM-DD
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/borrows \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<jwt_token>" \
  -d '{
    "bookTitle": "西游记",
    "borrower": "李四",
    "borrowDate": "2024-01-10"
  }'
```

**成功响应**:
```json
{
  "success": true,
  "message": "借阅记录创建成功",
  "data": {
    "id": "2",
    "bookTitle": "西游记",
    "borrower": "李四",
    "borrowDate": "2024-01-10",
    "returnDate": null,
    "createdAt": "2024-01-10T00:00:00.000Z",
    "updatedAt": "2024-01-10T00:00:00.000Z"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "图书标题、借阅者和借阅日期不能为空"
}
```

**状态码**:
- `200` - 成功
- `400` - 请求参数错误
- `401` - 未授权访问
- `500` - 服务器错误

---

### 3. 更新借阅记录

**接口地址**: `PUT /api/borrows/:id`

**功能描述**: 更新指定借阅记录

**认证要求**: 需要有效的JWT Token

**路径参数**:
- `id`: 借阅记录ID

**请求参数**:
```json
{
  "bookTitle": "string",    // 可选，图书标题
  "borrower": "string",     // 可选，借阅者姓名
  "borrowDate": "string",   // 可选，借阅日期
  "returnDate": "string"    // 可选，归还日期
}
```

**请求示例**:
```bash
curl -X PUT http://localhost:3000/api/borrows/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<jwt_token>" \
  -d '{
    "returnDate": "2024-01-15"
  }'
```

**成功响应**:
```json
{
  "success": true,
  "message": "借阅记录更新成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "借阅记录不存在"
}
```

**状态码**:
- `200` - 成功
- `404` - 借阅记录不存在
- `401` - 未授权访问
- `500` - 服务器错误

---

### 4. 删除借阅记录

**接口地址**: `DELETE /api/borrows/:id`

**功能描述**: 删除指定借阅记录

**认证要求**: 需要有效的JWT Token

**路径参数**:
- `id`: 借阅记录ID

**请求示例**:
```bash
curl -X DELETE http://localhost:3000/api/borrows/1 \
  -H "Cookie: token=<jwt_token>"
```

**成功响应**:
```json
{
  "success": true,
  "message": "借阅记录删除成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "借阅记录不存在"
}
```

**状态码**:
- `200` - 成功
- `404` - 借阅记录不存在
- `401` - 未授权访问
- `500` - 服务器错误

---

## 📊 数据统计 API

### 1. 获取借阅统计

**接口地址**: `GET /api/statistics/borrow`

**功能描述**: 获取借阅数据统计信息

**认证要求**: 需要有效的JWT Token

**查询参数**: 无

**请求示例**:
```bash
curl -X GET http://localhost:3000/api/statistics/borrow \
  -H "Cookie: token=<jwt_token>"
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "total": 50,           // 总借阅记录数
    "normal": 30,          // 正常借阅数
    "overdue": 5,          // 逾期数
    "returned": 15,        // 已归还数
    "trendData": {         // 最近30天趋势数据
      "dates": ["2024-01-01", "2024-01-02", "..."],
      "counts": [3, 5, 2, 8, "..."]
    }
  }
}
```

**状态码**:
- `200` - 成功
- `401` - 未授权访问
- `500` - 服务器错误

---

## 🛠️ 任务管理 API

### 1. 获取任务状态

**接口地址**: `GET /api/task/status`

**功能描述**: 获取后台任务状态信息

**认证要求**: 需要有效的JWT Token

**请求示例**:
```bash
curl -X GET http://localhost:3000/api/task/status \
  -H "Cookie: token=<jwt_token>"
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "taskName": "借阅状态更新任务",
    "status": "running",           // running, stopped, unknown
    "lastExecuteTime": "2024-01-01T12:00:00.000Z",
    "interval": 60000,             // 执行间隔(毫秒)
    "isRunning": true
  }
}
```

**状态码**:
- `200` - 成功
- `401` - 未授权访问
- `500` - 服务器错误

---

### 2. 启动任务

**接口地址**: `POST /api/task/start`

**功能描述**: 启动后台任务

**认证要求**: 需要有效的JWT Token

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/task/start \
  -H "Cookie: token=<jwt_token>"
```

**成功响应**:
```json
{
  "success": true,
  "message": "任务启动成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "任务已在运行中"
}
```

**状态码**:
- `200` - 成功
- `400` - 任务已在运行
- `401` - 未授权访问
- `500` - 服务器错误

---

### 3. 停止任务

**接口地址**: `POST /api/task/stop`

**功能描述**: 停止后台任务

**认证要求**: 需要有效的JWT Token

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/task/stop \
  -H "Cookie: token=<jwt_token>"
```

**成功响应**:
```json
{
  "success": true,
  "message": "任务停止成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "任务未在运行"
}
```

**状态码**:
- `200` - 成功
- `400` - 任务未在运行
- `401` - 未授权访问
- `500` - 服务器错误

---

### 4. 手动执行任务

**接口地址**: `POST /api/task/execute`

**功能描述**: 手动执行一次任务

**认证要求**: 需要有效的JWT Token

**请求示例**:
```bash
curl -X POST http://localhost:3000/api/task/execute \
  -H "Cookie: token=<jwt_token>"
```

**成功响应**:
```json
{
  "success": true,
  "message": "任务执行成功"
}
```

**状态码**:
- `200` - 成功
- `401` - 未授权访问
- `500` - 服务器错误

---

## 🔌 WebSocket 实时通信

### 1. WebSocket 连接

**连接地址**: `ws://localhost:3000/ws`

**功能描述**: 建立WebSocket连接，实现实时通信

**认证要求**: 连接后需发送认证消息

**连接示例**:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = function() {
    // 发送认证消息
    ws.send(JSON.stringify({
        type: 'auth',
        token: 'your_jwt_token'
    }));
};
```

**认证消息格式**:
```json
{
    "type": "auth",
    "token": "jwt_token_here"
}
```

---

### 2. 消息类型

#### 认证成功
```json
{
    "type": "auth_success",
    "message": "WebSocket 连接成功"
}
```

#### 认证失败
```json
{
    "type": "auth_error",
    "message": "身份验证失败"
}
```

#### 系统通知
```json
{
    "type": "notification",
    "title": "通知标题",
    "message": "通知内容",
    "time": "2024-01-01T12:00:00.000Z"
}
```

#### 数据更新通知
```json
{
    "type": "data_update",
    "module": "books",        // books, users, borrows
    "action": "create",       // create, update, delete
    "data": { /* 更新的数据 */ }
}
```

#### 任务状态更新
```json
{
    "type": "task_status_update",
    "status": "running",      // running, stopped
    "lastExecuteTime": "2024-01-01T12:00:00.000Z"
}
```

---

## 🚧 错误处理

### 错误响应格式

所有API错误都遵循统一的响应格式：

```json
{
    "success": false,
    "message": "错误描述信息",
    "error": "ERROR_CODE",     // 可选，错误代码
    "details": {}              // 可选，详细错误信息
}
```

### 常见错误码

| HTTP状态码 | 错误描述 | 解决方案 |
|-----------|---------|---------|
| `400` | 请求参数错误 | 检查请求参数格式和内容 |
| `401` | 未授权访问 | 检查JWT Token是否有效 |
| `403` | 权限不足 | 检查用户权限设置 |
| `404` | 资源不存在 | 检查资源ID是否正确 |
| `409` | 资源冲突 | 检查是否存在重复数据 |
| `500` | 服务器内部错误 | 联系系统管理员 |

### 错误示例

#### 参数验证错误
```json
{
    "success": false,
    "message": "参数验证失败",
    "error": "VALIDATION_ERROR",
    "details": {
        "username": "用户名不能为空",
        "password": "密码长度至少6位"
    }
}
```

#### 认证错误
```json
{
    "success": false,
    "message": "Token已过期",
    "error": "TOKEN_EXPIRED"
}
```

#### 权限错误
```json
{
    "success": false,
    "message": "权限不足，仅管理员可执行此操作",
    "error": "PERMISSION_DENIED"
}
```

---

## 📋 请求/响应示例

### 完整的图书管理流程示例

#### 1. 登录获取Token
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

#### 2. 获取图书列表
```bash
curl -X GET http://localhost:3000/api/books \
  -H "Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 3. 添加图书
```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -H "Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "title": "三国演义",
    "author": "罗贯中",
    "publisher": "人民文学出版社",
    "publishDate": "2020-03-01"
  }'
```

#### 4. 创建借阅记录
```bash
curl -X POST http://localhost:3000/api/borrows \
  -H "Content-Type: application/json" \
  -H "Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "bookTitle": "三国演义",
    "borrower": "王五",
    "borrowDate": "2024-01-15"
  }'
```

#### 5. 获取统计数据
```bash
curl -X GET http://localhost:3000/api/statistics/borrow \
  -H "Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🔗 前端集成示例

### Alpine.js 集成示例

#### 图书管理组件
```javascript
function bookManagement() {
    return {
        books: [],
        currentPage: 1,
        pageSize: 5,
        searchTerm: '',
        isLoading: false,

        async init() {
            await this.loadBooks();
        },

        async loadBooks() {
            this.isLoading = true;
            try {
                const response = await fetch(`/api/books?page=${this.currentPage}&pageSize=${this.pageSize}&search=${this.searchTerm}`);
                const data = await response.json();
                
                if (data.success) {
                    this.books = data.data;
                    this.pagination = data.pagination;
                } else {
                    this.showError(data.message);
                }
            } catch (error) {
                this.showError('获取图书列表失败');
            } finally {
                this.isLoading = false;
            }
        },

        async createBook(bookData) {
            try {
                const response = await fetch('/api/books', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bookData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.showSuccess('图书添加成功');
                    await this.loadBooks();
                } else {
                    this.showError(data.message);
                }
            } catch (error) {
                this.showError('添加图书失败');
            }
        }
    }
}
```

#### WebSocket 集成示例
```javascript
function websocketManager() {
    return {
        ws: null,
        isConnected: false,
        notifications: [],

        init() {
            this.connectWebSocket();
        },

        connectWebSocket() {
            this.ws = new WebSocket('ws://localhost:3000/ws');
            
            this.ws.onopen = () => {
                this.isConnected = true;
                // 发送认证消息
                this.ws.send(JSON.stringify({
                    type: 'auth',
                    token: this.getToken()
                }));
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                // 尝试重连
                setTimeout(() => this.connectWebSocket(), 3000);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket错误:', error);
            };
        },

        handleMessage(data) {
            switch (data.type) {
                case 'auth_success':
                    console.log('WebSocket认证成功');
                    break;
                case 'notification':
                    this.addNotification(data);
                    break;
                case 'data_update':
                    this.handleDataUpdate(data);
                    break;
            }
        },

        addNotification(notification) {
            this.notifications.unshift({
                ...notification,
                id: Date.now(),
                time: new Date().toLocaleTimeString()
            });
            
            // 只保留最近10条通知
            if (this.notifications.length > 10) {
                this.notifications = this.notifications.slice(0, 10);
            }
        }
    }
}
```

---

## 🔧 开发和调试

### API 测试工具

#### 1. 使用 curl 测试
```bash
# 设置基础URL
BASE_URL="http://localhost:3000"

# 登录并保存Cookie
curl -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  -c cookies.txt

# 使用Cookie访问其他API
curl -X GET "$BASE_URL/api/books" \
  -b cookies.txt
```

#### 2. 使用 Postman 测试
1. 创建新的Collection: "图书管理系统API"
2. 设置环境变量: `baseUrl = http://localhost:3000`
3. 创建登录请求并设置Tests脚本自动保存Token
4. 其他请求使用 `{{token}}` 变量

#### 3. 使用 JavaScript 测试
```javascript
// API测试脚本
class ApiTester {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.token = null;
    }

    async login(username, password) {
        const response = await fetch(`${this.baseUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            // 从Set-Cookie头部提取token
            const setCookie = response.headers.get('set-cookie');
            if (setCookie) {
                this.token = setCookie.split('token=')[1].split(';')[0];
            }
        }
        
        return response.json();
    }

    async get(endpoint) {
        return fetch(`${this.baseUrl}${endpoint}`, {
            headers: { 'Cookie': `token=${this.token}` }
        }).then(res => res.json());
    }

    async post(endpoint, data) {
        return fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `token=${this.token}`
            },
            body: JSON.stringify(data)
        }).then(res => res.json());
    }
}

// 使用示例
const api = new ApiTester();
await api.login('admin', 'admin123');
const books = await api.get('/api/books');
console.log(books);
```

### 调试技巧

#### 1. 日志记录
服务器会在控制台输出详细的请求日志：
```
[2024-01-01T12:00:00.000Z] POST /api/login - 200 (50ms)
[2024-01-01T12:00:01.000Z] GET /api/books - 200 (25ms)
[2024-01-01T12:00:02.000Z] WebSocket 连接已建立
```

#### 2. 错误追踪
- 检查浏览器开发者工具的Network标签
- 查看Console中的错误信息
- 检查服务器控制台输出

#### 3. Token 验证
```javascript
// 在浏览器控制台中验证token
function parseJWT(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// 使用方法
const token = document.cookie.split('token=')[1].split(';')[0];
console.log(parseJWT(token));
```

---

## 📖 版本历史

### v1.0.0 (当前版本)
- ✅ 完整的用户认证API
- ✅ 图书管理CRUD API
- ✅ 用户管理API
- ✅ 借阅管理API
- ✅ 数据统计API
- ✅ 任务管理API
- ✅ WebSocket实时通信
- ✅ JWT身份验证
- ✅ 错误处理机制
- ✅ Bun.password密码加密

### 未来版本规划

#### v1.1.0
- 📋 批量操作API
- 📋 高级搜索API
- 📋 数据导出API
- 📋 文件上传API

#### v1.2.0
- 📋 权限管理API
- 📋 日志记录API
- 📋 系统配置API
- 📋 通知管理API

---

## 📞 技术支持

### 常见问题

#### Q: 如何处理Token过期？
A: 当接收到401状态码时，重新调用登录API获取新Token。

#### Q: WebSocket连接失败怎么办？
A: 检查服务器是否运行，Token是否有效，网络连接是否正常。

#### Q: 如何实现文件上传？
A: 当前版本不支持文件上传，计划在v1.1.0版本中添加。

#### Q: 是否支持批量操作？
A: 当前版本不支持批量操作，计划在v1.1.0版本中添加。

#### Q: 密码是如何加密的？
A: 系统使用Bun.password进行密码加密，这是Bun内置的安全密码加密功能。

### 联系方式

- **文档更新**: 查看项目README.md和UI.md
- **错误报告**: 创建GitHub Issue
- **功能请求**: 提交Pull Request

---

**最后更新**: 2024年12月

**API版本**: v1.0.0

**文档版本**: v1.0.0 