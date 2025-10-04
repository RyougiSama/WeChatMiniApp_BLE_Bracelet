// index.ts
Page({
  data: {
    appName: '蓝牙智能手环',
    version: 'v2.0.0',
    welcomeMessage: '欢迎使用智能手环管理助手',
    description: '连接您的智能手环，通过指令查询实时健康数据',
    features: [
      {
        icon: '⌚',
        title: '设备连接',
        desc: '支持多种蓝牙手环设备连接'
      },
      {
        icon: '📡',
        title: '实时通信',
        desc: '双向数据传输，指令实时响应'
      },
      {
        icon: '💬',
        title: '智能查询',
        desc: '发送指令获取实时健康数据'
      },
      {
        icon: '🔒',
        title: '数据安全',
        desc: '本地处理，保护您的隐私数据'
      }
    ]
  },

  // 进入蓝牙功能页面
  goToBluetooth() {
    wx.navigateTo({
      url: '../bluetooth/bluetooth'
    })
  },

  onLoad() {
    console.log('蓝牙智能手环启动')
  },

  onShow() {
    // 页面显示时不需要加载统计数据，主要功能在蓝牙页面
  }
})