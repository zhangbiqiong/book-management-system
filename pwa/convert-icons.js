#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// 使用Canvas API将SVG转换为PNG
async function convertSVGToPNG(svgContent, size, outputPath) {
  try {
    // 创建一个简单的PNG图标（使用Canvas API）
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // 设置背景
    ctx.fillStyle = '#0d6efd';
    ctx.fillRect(0, 0, size, size);
    
    // 绘制书本图标
    const padding = size * 0.1;
    const innerSize = size - (padding * 2);
    
    // 书本主体
    ctx.fillStyle = 'white';
    ctx.fillRect(padding + innerSize * 0.1, padding + innerSize * 0.15, innerSize * 0.8, innerSize * 0.7);
    
    // 书页线条
    ctx.strokeStyle = '#0d6efd';
    ctx.lineWidth = Math.max(2, size / 64);
    
    const lineY1 = padding + innerSize * 0.35;
    const lineY2 = padding + innerSize * 0.5;
    const lineY3 = padding + innerSize * 0.65;
    const lineX1 = padding + innerSize * 0.25;
    const lineX2 = padding + innerSize * 0.75;
    
    ctx.beginPath();
    ctx.moveTo(lineX1, lineY1);
    ctx.lineTo(lineX2, lineY1);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(lineX1, lineY2);
    ctx.lineTo(lineX2, lineY2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(lineX1, lineY3);
    ctx.lineTo(lineX2, lineY3);
    ctx.stroke();
    
    // 书签
    ctx.fillStyle = '#dc3545';
    ctx.fillRect(padding + innerSize * 0.8, padding + innerSize * 0.15, innerSize * 0.1, innerSize * 0.3);
    
    // 装饰性元素
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(size * 0.8, size * 0.2, size * 0.05, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(size * 0.2, size * 0.8, size * 0.03, 0, 2 * Math.PI);
    ctx.fill();
    
    // 转换为PNG
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    writeFileSync(outputPath, buffer);
    console.log(`✅ 生成PNG图标: ${outputPath} (${size}x${size})`);
    
    return true;
  } catch (error) {
    console.error(`❌ 转换失败 ${outputPath}:`, error);
    return false;
  }
}

// 生成所有PNG图标
async function generatePNGIcons() {
  console.log('🚀 开始生成PNG图标...');
  
  const assertDir = join(process.cwd(), 'front', 'assert');
  const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
  
  let successCount = 0;
  let totalCount = iconSizes.length;
  
  for (const size of iconSizes) {
    const outputPath = join(assertDir, `icon-${size}x${size}.png`);
    
    // 创建简单的图标内容
    const success = await convertSVGToPNG('', size, outputPath);
    if (success) {
      successCount++;
    }
  }
  
  console.log(`\n🎉 PNG图标生成完成！`);
  console.log(`📊 成功: ${successCount}/${totalCount}`);
  console.log(`📁 图标文件保存在: front/assert/`);
  
  if (successCount < totalCount) {
    console.log(`⚠️  有 ${totalCount - successCount} 个图标生成失败`);
  }
}

// 运行脚本
if (import.meta.main) {
  generatePNGIcons();
} 