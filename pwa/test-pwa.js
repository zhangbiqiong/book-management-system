#!/usr/bin/env bun

import { readFileSync } from 'fs';
import { join } from 'path';

// PWA功能测试
async function testPWAFunctionality() {
  console.log('🚀 开始PWA功能测试...\n');
  
  const baseUrl = 'https://localhost:3001';
  const testResults = [];
  
  // 测试1: manifest.json
  try {
    const response = await fetch(`${baseUrl}/manifest.json`, {
      headers: { 'Accept': 'application/manifest+json' },
      // 忽略SSL证书验证（仅用于开发环境）
      rejectUnauthorized: false
    });
    
    if (response.ok) {
      const manifest = await response.json();
      testResults.push({
        test: 'manifest.json',
        status: '✅ 通过',
        details: `应用名称: ${manifest.name}, 版本: ${manifest.version || '1.0.0'}`
      });
    } else {
      testResults.push({
        test: 'manifest.json',
        status: '❌ 失败',
        details: `HTTP ${response.status}`
      });
    }
  } catch (error) {
    testResults.push({
      test: 'manifest.json',
      status: '❌ 错误',
      details: error.message
    });
  }
  
  // 测试2: Service Worker
  try {
    const response = await fetch(`${baseUrl}/sw.js`);
    
    if (response.ok) {
      const swContent = await response.text();
      const hasCacheLogic = swContent.includes('CACHE_NAME') && swContent.includes('addEventListener');
      
      testResults.push({
        test: 'Service Worker',
        status: '✅ 通过',
        details: hasCacheLogic ? '缓存逻辑正常' : '基本功能正常'
      });
    } else {
      testResults.push({
        test: 'Service Worker',
        status: '❌ 失败',
        details: `HTTP ${response.status}`
      });
    }
  } catch (error) {
    testResults.push({
      test: 'Service Worker',
      status: '❌ 错误',
      details: error.message
    });
  }
  
  // 测试3: 离线页面
  try {
    const response = await fetch(`${baseUrl}/offline.html`);
    
    if (response.ok) {
      const offlineContent = await response.text();
      const hasOfflineUI = offlineContent.includes('网络连接已断开') || offlineContent.includes('offline');
      
      testResults.push({
        test: '离线页面',
        status: '✅ 通过',
        details: hasOfflineUI ? '离线UI正常' : '页面可访问'
      });
    } else {
      testResults.push({
        test: '离线页面',
        status: '❌ 失败',
        details: `HTTP ${response.status}`
      });
    }
  } catch (error) {
    testResults.push({
      test: '离线页面',
      status: '❌ 错误',
      details: error.message
    });
  }
  
  // 测试4: PWA图标
  const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  let iconTestPassed = 0;
  
  for (const size of iconSizes) {
    try {
      const response = await fetch(`${baseUrl}/assert/icon-${size}x${size}.png`);
      if (response.ok) {
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
  
  // 测试5: PWA API
  try {
    const response = await fetch(`${baseUrl}/api/pwa/status`);
    
    if (response.ok) {
      const apiResponse = await response.json();
      testResults.push({
        test: 'PWA API',
        status: '✅ 通过',
        details: apiResponse.success ? 'API响应正常' : 'API可访问但需要认证'
      });
    } else {
      testResults.push({
        test: 'PWA API',
        status: '⚠️ 部分通过',
        details: `HTTP ${response.status} - 可能需要认证`
      });
    }
  } catch (error) {
    testResults.push({
      test: 'PWA API',
      status: '❌ 错误',
      details: error.message
    });
  }
  
  // 测试6: PWA测试页面
  try {
    const response = await fetch(`${baseUrl}/pwa-test.html`);
    
    if (response.ok) {
      const testPageContent = await response.text();
      const hasPWAFeatures = testPageContent.includes('PWA功能测试') && testPageContent.includes('Service Worker');
      
      testResults.push({
        test: 'PWA测试页面',
        status: '✅ 通过',
        details: hasPWAFeatures ? '测试页面功能完整' : '页面可访问'
      });
    } else {
      testResults.push({
        test: 'PWA测试页面',
        status: '❌ 失败',
        details: `HTTP ${response.status}`
      });
    }
  } catch (error) {
    testResults.push({
      test: 'PWA测试页面',
      status: '❌ 错误',
      details: error.message
    });
  }
  
  // 测试7: HTTP头部
  try {
    const response = await fetch(`${baseUrl}/`);
    const headers = response.headers;
    
    const hasSecurityHeaders = headers.get('X-Content-Type-Options') === 'nosniff' &&
                              headers.get('X-Frame-Options') === 'DENY' &&
                              headers.get('X-XSS-Protection') === '1; mode=block';
    
    const hasPWAHeaders = headers.get('X-PWA-Enabled') === 'true';
    
    testResults.push({
      test: 'HTTP头部',
      status: hasSecurityHeaders && hasPWAHeaders ? '✅ 通过' : '⚠️ 部分通过',
      details: `安全头部: ${hasSecurityHeaders ? '✅' : '❌'}, PWA头部: ${hasPWAHeaders ? '✅' : '❌'}`
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
}

// 运行测试
if (import.meta.main) {
  testPWAFunctionality().catch(console.error);
} 