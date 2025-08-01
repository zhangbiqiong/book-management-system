# PWA功能测试指南

## 概述

本文档提供了完整的PWA功能测试指南，帮助您验证图书管理系统的PWA功能是否正常工作。

## 测试环境要求

- **浏览器**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **HTTPS**: PWA功能需要HTTPS环境（开发环境使用自签名证书）
- **移动设备**: 建议在移动设备上测试以获得最佳体验

## 测试步骤

### 1. 基础PWA功能测试

#### 1.1 访问PWA测试页面
```
https://localhost:3001/pwa-test.html
```

#### 1.2 检查PWA状态
在测试页面中查看以下信息：
- ✅ 应用已安装状态
- ✅ 网络连接状态
- ✅ Service Worker支持
- ✅ 通知权限状态
- ✅ 缓存支持
- ✅ 显示模式

### 2. Service Worker测试

#### 2.1 检查Service Worker注册
1. 打开浏览器开发者工具
2. 进入 Application/Storage 标签页
3. 查看 Service Workers 部分
4. 确认 Service Worker 已注册并处于激活状态

#### 2.2 测试离线功能
1. 在开发者工具中切换到 Offline 模式
2. 刷新页面，确认离线页面正常显示
3. 恢复网络连接，确认页面正常加载

#### 2.3 测试缓存功能
1. 在开发者工具中查看 Cache Storage
2. 确认静态资源和API响应已缓存
3. 测试缓存更新机制

### 3. 应用安装测试

#### 3.1 桌面安装测试
1. 在Chrome浏览器中访问应用
2. 查看地址栏右侧的安装图标
3. 点击安装图标，确认应用可以安装到桌面
4. 安装后启动应用，确认独立窗口模式正常

#### 3.2 移动设备安装测试
1. 在移动设备上访问应用
2. 使用浏览器的"添加到主屏幕"功能
3. 确认应用图标正确显示
4. 从主屏幕启动应用，确认全屏模式正常

### 4. 推送通知测试

#### 4.1 通知权限测试
1. 在PWA测试页面点击"请求通知权限"
2. 确认浏览器显示权限请求对话框
3. 授权后测试发送通知功能

#### 4.2 通知发送测试
1. 点击"发送测试通知"
2. 确认系统通知正常显示
3. 测试通知点击事件

### 5. 后台同步测试

#### 5.1 同步功能测试
1. 在PWA测试页面测试缓存管理功能
2. 确认缓存信息正确显示
3. 测试缓存清除功能

### 6. 性能测试

#### 6.1 加载性能
1. 使用Lighthouse进行性能审计
2. 检查PWA评分（应达到90+）
3. 确认首次加载和后续加载性能

#### 6.2 离线性能
1. 在离线模式下测试应用响应速度
2. 确认缓存的资源能够快速加载

## 常见问题排查

### 问题1: Service Worker未注册
**症状**: 控制台显示Service Worker注册失败
**解决方案**:
1. 确认HTTPS环境
2. 检查sw.js文件路径是否正确
3. 确认服务器正确设置了Content-Type

### 问题2: 应用无法安装
**症状**: 没有显示安装提示
**解决方案**:
1. 确认manifest.json文件正确配置
2. 检查图标文件是否存在
3. 确认应用满足安装条件

### 问题3: 离线功能不工作
**症状**: 离线时显示网络错误
**解决方案**:
1. 检查Service Worker缓存配置
2. 确认offline.html文件存在
3. 验证缓存策略是否正确

### 问题4: 通知不显示
**症状**: 通知权限已授权但通知不显示
**解决方案**:
1. 确认浏览器支持通知API
2. 检查通知权限状态
3. 验证通知代码是否正确

## 测试检查清单

### 基础功能
- [ ] manifest.json 可正常访问
- [ ] sw.js 可正常访问
- [ ] 图标文件可正常加载
- [ ] 离线页面正常显示

### Service Worker
- [ ] Service Worker 成功注册
- [ ] 离线缓存正常工作
- [ ] 缓存更新机制正常
- [ ] 后台同步功能正常

### 应用安装
- [ ] 桌面安装功能正常
- [ ] 移动设备安装功能正常
- [ ] 应用图标正确显示
- [ ] 独立窗口模式正常

### 通知功能
- [ ] 通知权限请求正常
- [ ] 通知发送功能正常
- [ ] 通知点击事件正常

### 性能
- [ ] Lighthouse PWA评分90+
- [ ] 首次加载性能良好
- [ ] 离线加载性能良好

## 自动化测试

### 使用Lighthouse CLI
```bash
# 安装Lighthouse CLI
npm install -g lighthouse

# 运行PWA审计
lighthouse https://localhost:3001 --output=json --output-path=./lighthouse-report.json
```

### 使用Puppeteer进行自动化测试
```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // 测试Service Worker注册
  await page.goto('https://localhost:3001');
  const swRegistered = await page.evaluate(() => {
    return 'serviceWorker' in navigator;
  });
  
  console.log('Service Worker支持:', swRegistered);
  
  await browser.close();
})();
```

## 持续集成

建议在CI/CD流程中包含PWA测试：

1. **构建时测试**: 确保PWA文件正确生成
2. **部署后测试**: 验证PWA功能在生产环境正常工作
3. **性能监控**: 持续监控PWA性能指标

## 总结

通过以上测试步骤，您可以全面验证PWA功能的完整性。建议定期进行这些测试，确保PWA功能始终保持最佳状态。

如果遇到问题，请参考常见问题排查部分，或查看浏览器控制台的错误信息进行调试。 