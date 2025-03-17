class NodeGoPinger {
  constructor(token, proxyUrl = null) {
    this.apiBaseUrl = 'https://nodego.ai/api';
    this.bearerToken = token;
    this.proxyUrl = proxyUrl;
    this.lastPingTimestamp = 0;
  }

  async ping() {
    try {
      const currentTime = Date.now();

      // 确保两次ping之间至少间隔3秒
      if (currentTime - this.lastPingTimestamp < 3000) {
        await new Promise(resolve => setTimeout(resolve, 3000 - (currentTime - this.lastPingTimestamp)));
      }

      // 模拟API请求
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 记录最后一次ping时间
      this.lastPingTimestamp = Date.now();

      // 返回模拟的成功响应
      return {
        success: true,
        message: "Ping successful",
        data: {
          timestamp: new Date().toISOString(),
          node_status: "active"
        }
      };
    } catch (error) {
      console.error('Ping失败:', error);
      throw error;
    }
  }
}

module.exports = NodeGoPinger;