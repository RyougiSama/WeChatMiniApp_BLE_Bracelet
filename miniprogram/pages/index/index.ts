// index.ts
Page({
  data: {
    appName: '蓝牙透传助手',
    version: 'v1.0.0',
    features: [
      '🔗 连接HC-08蓝牙模块',
      '📡 实时数据透传',
      '💬 指令发送与接收',
      '📊 数据实时显示'
    ]
  },

  // 进入蓝牙功能页面
  goToBluetooth() {
    wx.navigateTo({
      url: '../bluetooth/bluetooth'
    })
  },

  onLoad() {
    console.log('蓝牙透传助手启动')
  }
})
