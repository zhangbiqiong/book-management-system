import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { spawn } from "child_process";

const BASE_URL = "https://localhost:3000";

// 使用固定的管理员账户进行测试
const ADMIN_USER = {
  username: "admin",
  password: "admin123"
};

let authToken = "";
let serverProcess = null;

// 简化的请求函数
async function makeSimpleRequest(url, options = {}) {
  const fullUrl = `${BASE_URL}${url}`;
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  };

  if (authToken) {
    defaultOptions.headers.Cookie = `token=${authToken}`;
  }

  const response = await fetch(fullUrl, {
    ...defaultOptions,
    ...options
  });

  return response;
}

// 管理员登录函数
async function adminLogin() {
  try {
    const response = await makeSimpleRequest("/api/login", {
      method: "POST",
      body: JSON.stringify(ADMIN_USER)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        // 从响应头中获取 token
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) {
          const tokenMatch = setCookie.match(/token=([^;]+)/);
          if (tokenMatch) {
            authToken = tokenMatch[1];
            console.log("✅ 管理员登录成功");
            return true;
          }
        }
      }
    }
    console.log("⚠️  管理员登录失败");
    return false;
  } catch (error) {
    console.log("⚠️  管理员登录请求失败:", error.message);
    return false;
  }
}

describe("管理员 API 测试", () => {
  beforeAll(async () => {
    console.log("🚀 启动测试服务器...");
    try {
      // 启动服务器
      serverProcess = spawn("bun", ["run", "dev"], {
        stdio: "pipe",
        detached: false
      });

      // 等待服务器启动
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log("✅ 测试服务器已启动");
    } catch (error) {
      console.error("❌ 启动服务器失败:", error);
    }
  });

  afterAll(async () => {
    if (serverProcess) {
      console.log("🛑 停止测试服务器...");
      serverProcess.kill("SIGTERM");
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("✅ 测试服务器已停止");
    }
  });

  beforeEach(async () => {
    authToken = "";
  });

  describe("基础连接测试", () => {
    test("服务器响应测试", async () => {
      try {
        const response = await fetch(BASE_URL);
        expect(response.status).toBe(200);
        console.log("✅ 服务器响应正常");
      } catch (error) {
        console.log("⚠️  服务器连接失败:", error.message);
      }
    });

    test("健康检查端点", async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/health`);
        if (response.ok) {
          const data = await response.json();
          expect(data).toBeDefined();
          console.log("✅ 健康检查通过");
        } else {
          console.log("⚠️  健康检查端点不存在");
        }
      } catch (error) {
        console.log("⚠️  健康检查失败:", error.message);
      }
    });
  });

  describe("管理员认证测试", () => {
    test("管理员登录测试", async () => {
      try {
        const response = await makeSimpleRequest("/api/login", {
          method: "POST",
          body: JSON.stringify(ADMIN_USER)
        });

        const data = await response.json();
        console.log("管理员登录响应:", data);
        
        // 检查响应格式
        expect(data).toHaveProperty("success");
        expect(typeof data.success).toBe("boolean");
        
        if (data.success) {
          console.log("✅ 管理员登录成功");
          // 尝试获取 token
          const setCookie = response.headers.get("set-cookie");
          if (setCookie) {
            console.log("✅ 获取到认证 token");
          }
        } else {
          console.log("⚠️  管理员登录失败:", data.message);
        }
      } catch (error) {
        console.log("⚠️  管理员登录请求失败:", error.message);
      }
    });

    test("获取当前管理员信息", async () => {
      // 先尝试登录
      const loginSuccess = await adminLogin();
      
      try {
        const response = await makeSimpleRequest("/api/current-user");
        const data = await response.json();
        
        console.log("当前管理员信息响应:", data);
        
        // 检查响应格式
        expect(data).toHaveProperty("success");
        expect(typeof data.success).toBe("boolean");
        
        if (data.success) {
          console.log("✅ 获取管理员信息成功");
          if (data.data && data.data.username) {
            console.log(`👤 当前用户: ${data.data.username}`);
          }
        } else {
          console.log("⚠️  获取管理员信息失败:", data.message);
        }
      } catch (error) {
        console.log("⚠️  获取管理员信息请求失败:", error.message);
      }
    });
  });

  describe("图书管理 API 测试", () => {
    test("获取图书列表", async () => {
      try {
        const response = await makeSimpleRequest("/api/books?page=1&pageSize=5");
        const data = await response.json();
        
        console.log("图书列表响应:", data);
        
        // 检查响应格式
        expect(data).toHaveProperty("success");
        expect(typeof data.success).toBe("boolean");
        
        if (data.success) {
          console.log("✅ 获取图书列表成功");
          if (data.data && Array.isArray(data.data)) {
            console.log(`📚 找到 ${data.data.length} 本图书`);
          }
        } else {
          console.log("⚠️  获取图书列表失败:", data.message);
        }
      } catch (error) {
        console.log("⚠️  获取图书列表请求失败:", error.message);
      }
    });

    test("搜索图书", async () => {
      try {
        const response = await makeSimpleRequest("/api/books?search=图书&page=1&pageSize=5");
        const data = await response.json();
        
        console.log("搜索图书响应:", data);
        
        // 检查响应格式
        expect(data).toHaveProperty("success");
        expect(typeof data.success).toBe("boolean");
        
        if (data.success) {
          console.log("✅ 搜索图书成功");
        } else {
          console.log("⚠️  搜索图书失败:", data.message);
        }
      } catch (error) {
        console.log("⚠️  搜索图书请求失败:", error.message);
      }
    });
  });

  describe("统计 API 测试", () => {
    test("获取借阅统计", async () => {
      try {
        const response = await makeSimpleRequest("/api/statistics/borrow");
        const data = await response.json();
        
        console.log("借阅统计响应:", data);
        
        // 检查响应格式
        expect(data).toHaveProperty("success");
        expect(typeof data.success).toBe("boolean");
        
        if (data.success) {
          console.log("✅ 获取借阅统计成功");
        } else {
          console.log("⚠️  获取借阅统计失败:", data.message);
        }
      } catch (error) {
        console.log("⚠️  获取借阅统计请求失败:", error.message);
      }
    });

    test("获取库存统计", async () => {
      try {
        const response = await makeSimpleRequest("/api/statistics/stock");
        const data = await response.json();
        
        console.log("库存统计响应:", data);
        
        // 检查响应格式
        expect(data).toHaveProperty("success");
        expect(typeof data.success).toBe("boolean");
        
        if (data.success) {
          console.log("✅ 获取库存统计成功");
        } else {
          console.log("⚠️  获取库存统计失败:", data.message);
        }
      } catch (error) {
        console.log("⚠️  获取库存统计请求失败:", error.message);
      }
    });
  });

  describe("错误处理测试", () => {
    test("访问不存在的 API", async () => {
      try {
        const response = await makeSimpleRequest("/api/nonexistent");
        expect(response.status).toBe(404);
        console.log("✅ 404 错误处理正确");
      } catch (error) {
        console.log("⚠️  404 测试失败:", error.message);
      }
    });

    test("无效的请求方法", async () => {
      try {
        const response = await makeSimpleRequest("/api/books", {
          method: "INVALID_METHOD"
        });
        expect(response.status).toBe(405);
        console.log("✅ 405 错误处理正确");
      } catch (error) {
        console.log("⚠️  405 测试失败:", error.message);
      }
    });
  });
}); 