#!/usr/bin/env bun

import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// PWA图标尺寸配置
const ICON_SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' }
];

// 生成SVG图标的函数
function generateSVGIcon(size) {
  const padding = size * 0.1; // 10% padding
  const innerSize = size - (padding * 2);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景圆形 -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#0d6efd"/>
  
  <!-- 书本图标 -->
  <g transform="translate(${padding + innerSize*0.1}, ${padding + innerSize*0.15})">
    <!-- 书本主体 -->
    <rect x="0" y="0" width="${innerSize*0.8}" height="${innerSize*0.7}" rx="4" fill="white" opacity="0.9"/>
    
    <!-- 书页线条 -->
    <line x1="${innerSize*0.15}" y1="${innerSize*0.2}" x2="${innerSize*0.65}" y2="${innerSize*0.2}" stroke="#0d6efd" stroke-width="2"/>
    <line x1="${innerSize*0.15}" y1="${innerSize*0.35}" x2="${innerSize*0.65}" y2="${innerSize*0.35}" stroke="#0d6efd" stroke-width="2"/>
    <line x1="${innerSize*0.15}" y1="${innerSize*0.5}" x2="${innerSize*0.65}" y2="${innerSize*0.5}" stroke="#0d6efd" stroke-width="2"/>
    
    <!-- 书签 -->
    <rect x="${innerSize*0.7}" y="0" width="${innerSize*0.1}" height="${innerSize*0.3}" fill="#dc3545" rx="2"/>
  </g>
  
  <!-- 装饰性元素 -->
  <circle cx="${size*0.8}" cy="${size*0.2}" r="${size*0.05}" fill="white" opacity="0.3"/>
  <circle cx="${size*0.2}" cy="${size*0.8}" r="${size*0.03}" fill="white" opacity="0.2"/>
</svg>`;
}

// 生成启动画面的函数
function generateSplashScreen(width, height) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景渐变 -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- 背景 -->
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  
  <!-- 中心图标 -->
  <g transform="translate(${width/2 - 100}, ${height/2 - 100})">
    <!-- 书本图标 -->
    <circle cx="100" cy="100" r="80" fill="white" opacity="0.9"/>
    <rect x="30" y="40" width="140" height="120" rx="8" fill="#0d6efd" opacity="0.8"/>
    <rect x="40" y="50" width="120" height="100" rx="4" fill="white"/>
    
    <!-- 书页线条 -->
    <line x1="60" y1="80" x2="140" y2="80" stroke="#0d6efd" stroke-width="3"/>
    <line x1="60" y1="100" x2="140" y2="100" stroke="#0d6efd" stroke-width="3"/>
    <line x1="60" y1="120" x2="140" y2="120" stroke="#0d6efd" stroke-width="3"/>
    
    <!-- 书签 -->
    <rect x="150" y="50" width="15" height="60" fill="#dc3545" rx="3"/>
  </g>
  
  <!-- 应用名称 -->
  <text x="${width/2}" y="${height - 100}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="bold">
    图书管理系统
  </text>
  
  <!-- 加载指示器 -->
  <circle cx="${width/2 - 30}" cy="${height - 50}" r="4" fill="white" opacity="0.6">
    <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" begin="0s"/>
  </circle>
  <circle cx="${width/2}" cy="${height - 50}" r="4" fill="white" opacity="0.6">
    <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" begin="0.5s"/>
  </circle>
  <circle cx="${width/2 + 30}" cy="${height - 50}" r="4" fill="white" opacity="0.6">
    <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" begin="1s"/>
  </circle>
</svg>`;
}

// 主函数
async function generateIcons() {
  console.log('🚀 开始生成PWA图标...');
  
  const assertDir = join(process.cwd(), 'front', 'assert');
  
  try {
    // 生成不同尺寸的图标
    for (const icon of ICON_SIZES) {
      const svgContent = generateSVGIcon(icon.size);
      const filePath = join(assertDir, icon.name.replace('.png', '.svg'));
      
      writeFileSync(filePath, svgContent);
      console.log(`✅ 生成图标: ${icon.name.replace('.png', '.svg')} (${icon.size}x${icon.size})`);
    }
    
    // 生成启动画面
    const splashScreens = [
      { width: 1280, height: 720, name: 'screenshot-wide.svg' },
      { width: 750, height: 1334, name: 'screenshot-narrow.svg' }
    ];
    
    for (const screen of splashScreens) {
      const svgContent = generateSplashScreen(screen.width, screen.height);
      const filePath = join(assertDir, screen.name);
      
      writeFileSync(filePath, svgContent);
      console.log(`✅ 生成启动画面: ${screen.name} (${screen.width}x${screen.height})`);
    }
    
    // 生成简单的PNG图标（使用Canvas API）
    console.log('📝 注意: PNG图标需要使用图像处理工具转换SVG文件');
    console.log('💡 建议使用在线工具或图像编辑软件将SVG转换为PNG');
    
    console.log('\n🎉 PWA图标生成完成！');
    console.log('📁 图标文件保存在: front/assert/');
    console.log('🔧 请将SVG文件转换为PNG格式以支持更多浏览器');
    
  } catch (error) {
    console.error('❌ 生成图标时出错:', error);
  }
}

// 运行脚本
if (import.meta.main) {
  generateIcons();
} 