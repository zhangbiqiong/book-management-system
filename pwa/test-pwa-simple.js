#!/usr/bin/env bun

import { execSync } from 'child_process';

// PWA功能测试
async function testPWAFunctionality() {
  console.log('🚀 开始PWA功能测试...\n');
  
  const baseUrl = 'https://localhost:3001';
  const testResults = [];
  
  // 测试函数
  function testEndpoint(path, name, expectedStatus = 200) {
    try {
      const result = execSync(`curl -k -s -o /dev/null -w "%{http_code}" ${baseUrl}${path}`, { encoding: 'utf8' });
      const status = parseInt(result.trim());
      
      if (status === expectedStatus) {
        testResults.push({
          test: name,
          status: '✅ 通过',
          details: `HTTP ${status}`
        });
        return true;
      } else {
        testResults.push({
          test: name,
          status: '❌ 失败',
          details: `HTTP ${status} (期望 ${expectedStatus})`
        });
        return false;
      }
    } catch (error) {
      testResults.push({
        test: name,
        status: '❌ 错误',
        details: error.message
      });
      return false;
    }
  }
  
  // 测试1: manifest.json
  testEndpoint('/manifest.json', 'manifest.json');
  
  // 测试2: Service Worker
  testEndpoint('/sw.js', 'Service Worker');
  
  // 测试3: 离线页面
  testEndpoint('/offline.html', '离线页面');
  
  // 测试4: PWA测试页面
  testEndpoint('/pwa-test.html', 'PWA测试页面');
  
  // 测试5: 主页面（应该重定向到登录页）
  testEndpoint('/', '主页面', 302);
  
  // 测试6: PWA API（应该返回401未授权）
  testEndpoint('/api/pwa/status', 'PWA API', 401);
  
  // 测试7: 图标文件
  const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  let iconTestPassed = 0;
  
  for (const size of iconSizes) {
    try {
      const result = execSync(`curl -k -s -o /dev/null -w "%{http_code}" ${baseUrl}/assert/icon-${size}x${size}.png`, { encoding: 'utf8' });
      const status = parseInt(result.trim());
      if (status === 200) {
        iconTestPassed++;
      }
    } catch (error) {
      // 忽略错误
    }
  }
  
  testResults.push({
    test: 'PWA图标',
    status: iconTestPassed === iconSizes.length ? '✅ 通过' : '⚠️ 部分通过',
    details: `${iconTestPassed}/${iconSizes.length} 个图标可访问`
  });
  
  // 测试8: HTTP头部
  try {
    const result = execSync(`curl -k -s -I ${baseUrl}/ | grep -E "(X-PWA-Enabled|X-Content-Type-Options)"`, { encoding: 'utf8' });
    const hasPWAHeaders = result.includes('X-PWA-Enabled: true');
    const hasSecurityHeaders = result.includes('X-Content-Type-Options: nosniff');
    
    testResults.push({
      test: 'HTTP头部',
      status: hasPWAHeaders && hasSecurityHeaders ? '✅ 通过' : '⚠️ 部分通过',
      details: `PWA头部: ${hasPWAHeaders ? '✅' : '❌'}, 安全头部: ${hasSecurityHeaders ? '✅' : '❌'}`
    });
  } catch (error) {
    testResults.push({
      test: 'HTTP头部',
      status: '❌ 错误',
      details: error.message
    });
  }
  
  // 显示测试结果
  console.log('📊 PWA功能测试结果:\n');
  
  let passedCount = 0;
  let totalCount = testResults.length;
  
  testResults.forEach(result => {
    console.log(`${result.status} ${result.test}`);
    console.log(`   详情: ${result.details}\n`);
    
    if (result.status.includes('✅')) {
      passedCount++;
    }
  });
  
  // 总结
  console.log('📈 测试总结:');
  console.log(`✅ 通过: ${passedCount}/${totalCount}`);
  console.log(`📊 成功率: ${Math.round((passedCount / totalCount) * 100)}%`);
  
  if (passedCount === totalCount) {
    console.log('\n🎉 所有PWA功能测试通过！');
  } else if (passedCount >= totalCount * 0.8) {
    console.log('\n👍 PWA功能基本正常，建议检查失败的测试项');
  } else {
    console.log('\n⚠️ PWA功能存在问题，请检查失败的测试项');
  }
  
  // 提供访问链接
  console.log('\n🌐 访问链接:');
  console.log(`   主应用: ${baseUrl}`);
  console.log(`   PWA测试页面: ${baseUrl}/pwa-test.html`);
  console.log(`   Manifest: ${baseUrl}/manifest.json`);
  console.log(`   Service Worker: ${baseUrl}/sw.js`);
  
  // 提供手动测试命令
  console.log('\n🔧 手动测试命令:');
  console.log(`   curl -k ${baseUrl}/manifest.json`);
  console.log(`   curl -k ${baseUrl}/sw.js | head -5`);
  console.log(`   curl -k -I ${baseUrl}/`);
}

// 运行测试
if (import.meta.main) {
  testPWAFunctionality().catch(console.error);
} 