const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    on: (channel, callback) => {
      // 添加事件监听
      const listener = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, listener);
      
      // 返回取消监听的函数
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    },
    once: (channel, callback) => {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    },
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    }
  }
}); 