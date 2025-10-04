// index.ts
Page({
  data: {
    appName: '蓝牙智能手环',
    version: 'v2.0.0',
    features: [
      {
        icon: '🔗',
        title: '智能连接',
        desc: '快速连接智能手环设备'
      },
      {
        icon: '�',
        title: '实时监测',
        desc: '心率、步数、睡眠监测'
      },
      {
        icon: '📊',
        title: '数据分析',
        desc: '健康数据统计分析'
      },
      {
        icon: '�',
        title: '消息提醒',
        desc: '来电、短信智能提醒'
      }
    ],
    stats: [
      { label: '连接设备', value: '0', unit: '台' },
      { label: '今日步数', value: '0', unit: '步' },
      { label: '心率监测', value: '0', unit: 'bpm' }
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
    this.loadUserStats()
  },

  onShow() {
    this.loadUserStats()
  },

  // 加载用户统计数据
  loadUserStats() {
    // 模拟加载用户数据
    const mockStats = [
      { label: '连接设备', value: '1', unit: '台' },
      { label: '今日步数', value: '8,520', unit: '步' },
      { label: '心率监测', value: '72', unit: 'bpm' }
    ]
    
    this.setData({
      stats: mockStats
    })
  }
})
