#!/usr/bin/env bun

import { writeFileSync } from 'fs';
import { join } from 'path';

// 简单的PNG图标数据（Base64编码）
const createSimplePNG = (size) => {
  // 这是一个最小的PNG文件结构
  const pngHeader = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG签名
  ]);
  
  // 创建一个简单的1x1像素的PNG（蓝色背景）
  const width = size;
  const height = size;
  
  // IHDR块
  const ihdrData = new Uint8Array(13);
  const view = new DataView(ihdrData.buffer);
  view.setUint32(0, width, false);   // 宽度
  view.setUint32(4, height, false);  // 高度
  ihdrData[8] = 8;  // 位深度
  ihdrData[9] = 2;  // 颜色类型 (RGB)
  ihdrData[10] = 0; // 压缩方法
  ihdrData[11] = 0; // 过滤方法
  ihdrData[12] = 0; // 交错方法
  
  const ihdrCRC = calculateCRC(ihdrData);
  const ihdrChunk = createChunk('IHDR', ihdrData);
  
  // 创建图像数据（简单的蓝色背景）
  const pixelData = new Uint8Array(width * height * 3);
  for (let i = 0; i < pixelData.length; i += 3) {
    pixelData[i] = 13;     // R (蓝色主题)
    pixelData[i + 1] = 110; // G
    pixelData[i + 2] = 253; // B
  }
  
  // 添加过滤字节
  const filteredData = new Uint8Array(pixelData.length + height);
  for (let i = 0; i < height; i++) {
    filteredData[i * (width * 3 + 1)] = 0; // 过滤类型
    filteredData.set(pixelData.slice(i * width * 3, (i + 1) * width * 3), i * (width * 3 + 1) + 1);
  }
  
  const idatChunk = createChunk('IDAT', filteredData);
  const iendChunk = createChunk('IEND', new Uint8Array(0));
  
  // 组合PNG文件
  const pngData = new Uint8Array(
    pngHeader.length + 
    ihdrChunk.length + 
    idatChunk.length + 
    iendChunk.length
  );
  
  let offset = 0;
  pngData.set(pngHeader, offset);
  offset += pngHeader.length;
  
  pngData.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  
  pngData.set(idatChunk, offset);
  offset += idatChunk.length;
  
  pngData.set(iendChunk, offset);
  
  return pngData;
};

// 创建PNG块
function createChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  const length = data.length;
  
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  
  view.setUint32(0, length, false); // 数据长度
  chunk.set(typeBytes, 4); // 块类型
  chunk.set(data, 8); // 数据
  view.setUint32(8 + data.length, calculateCRC(chunk.slice(4, 8 + data.length)), false); // CRC
  
  return chunk;
}

// 计算CRC32
function calculateCRC(data) {
  let crc = 0xFFFFFFFF;
  const table = new Uint32Array(256);
  
  // 生成CRC表
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  
  // 计算CRC
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// 生成所有PNG图标
async function generatePNGIcons() {
  console.log('🚀 开始生成PNG图标...');
  
  const assertDir = join(process.cwd(), 'front', 'assert');
  const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
  
  let successCount = 0;
  let totalCount = iconSizes.length;
  
  for (const size of iconSizes) {
    try {
      const outputPath = join(assertDir, `icon-${size}x${size}.png`);
      const pngData = createSimplePNG(size);
      
      writeFileSync(outputPath, pngData);
      console.log(`✅ 生成PNG图标: icon-${size}x${size}.png (${size}x${size})`);
      successCount++;
    } catch (error) {
      console.error(`❌ 转换失败 icon-${size}x${size}.png:`, error);
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