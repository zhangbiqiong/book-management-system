# HTTPS 配置说明

## 概述

本项目已配置为支持 HTTPS 连接，使用本地自签名证书。

## 证书文件

- `localhost+2.pem` - SSL 证书文件
- `localhost+2-key.pem` - SSL 私钥文件

## 配置详情

### 服务器配置

在 `server.js` 中添加了以下 HTTPS 配置：

```javascript
// HTTPS 配置
const httpsConfig = {
  cert: Bun.file("localhost+2.pem"),
  key: Bun.file("localhost+2-key.pem")
};

const server = serve({
  // ... 其他配置
  tls: httpsConfig,
  // ... 其他配置
});
```

### 访问地址

- **HTTPS**: https://localhost:3000
- **WebSocket (WSS)**: wss://localhost:3000/ws

## 浏览器访问

由于使用的是自签名证书，浏览器会显示安全警告。在开发环境中，您可以：

1. 点击"高级"
2. 选择"继续访问 localhost（不安全）"

## 测试

### 使用 curl 测试

```bash
# 测试 HTTPS 连接
curl -k https://localhost:3000

# 测试 API 端点
curl -k https://localhost:3000/api/health
```

### 使用浏览器测试

直接在浏览器中访问：https://localhost:3000

## 注意事项

1. **自签名证书**: 当前使用的是自签名证书，仅适用于开发环境
2. **浏览器警告**: 浏览器会显示安全警告，这是正常的
3. **生产环境**: 在生产环境中应使用受信任的 SSL 证书
4. **WebSocket**: WebSocket 连接也会自动使用 WSS (WebSocket Secure)

## 故障排除

如果遇到连接问题：

1. 确认证书文件存在且可读
2. 检查端口 3000 是否被占用
3. 确认服务器正在运行
4. 检查防火墙设置

## 相关文件

- `server.js` - 主服务器文件，包含 HTTPS 配置
- `back-js/config.js` - 服务器端口配置
- `localhost+2.pem` - SSL 证书
- `localhost+2-key.pem` - SSL 私钥 