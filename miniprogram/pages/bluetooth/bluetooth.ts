// bluetooth.ts
interface BluetoothDevice {
  deviceId: string;
  name: string;
  RSSI: number;
}

Page({
  data: {
    // 蓝牙状态
    bluetoothEnabled: false,
    scanning: false,
    connected: false,
    
    // 设备列表
    devices: [] as BluetoothDevice[],
    connectedDevice: null as BluetoothDevice | null,
    
    // 数据通信
    receivedData: [] as string[],
    sendMessage: '',
    
    // 服务和特征值UUID (HC-08默认)
    serviceUUID: 'FFE0',
    characteristicUUID: 'FFE1'
  },

  onLoad() {
    this.initBluetooth();
  },

  onUnload() {
    this.disconnect();
  },

  // 初始化蓝牙
  initBluetooth() {
    wx.openBluetoothAdapter({
      success: () => {
        console.log('蓝牙适配器初始化成功');
        this.setData({ bluetoothEnabled: true });
      },
      fail: (err) => {
        console.error('蓝牙适配器初始化失败:', err);
        wx.showToast({
          title: '请开启蓝牙',
          icon: 'none'
        });
      }
    });
  },

  // 开始扫描设备
  startScan() {
    if (!this.data.bluetoothEnabled) {
      wx.showToast({
        title: '蓝牙未初始化',
        icon: 'none'
      });
      return;
    }

    this.setData({ 
      scanning: true,
      devices: []
    });

    // 监听设备发现
    wx.onBluetoothDeviceFound((result) => {
      const devices = result.devices;
      const newDevices = [...this.data.devices];
      
      devices.forEach(device => {
        if (device.name && !newDevices.find(d => d.deviceId === device.deviceId)) {
          newDevices.push({
            deviceId: device.deviceId,
            name: device.name,
            RSSI: device.RSSI
          });
        }
      });
      
      this.setData({ devices: newDevices });
    });

    // 开始扫描
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      success: () => {
        console.log('开始扫描蓝牙设备');
        // 10秒后停止扫描
        setTimeout(() => {
          this.stopScan();
        }, 10000);
      },
      fail: (err) => {
        console.error('扫描失败:', err);
        this.setData({ scanning: false });
      }
    });
  },

  // 停止扫描
  stopScan() {
    wx.stopBluetoothDevicesDiscovery({
      success: () => {
        console.log('停止扫描');
        this.setData({ scanning: false });
      }
    });
  },

  // 连接设备
  connectDevice(e: any) {
    const deviceId = e.currentTarget.dataset.deviceid;
    const device = this.data.devices.find(d => d.deviceId === deviceId);
    
    if (!device) return;

    wx.showLoading({ title: '连接中...' });

    wx.createBLEConnection({
      deviceId: deviceId,
      success: () => {
        console.log('连接成功');
        this.setData({
          connected: true,
          connectedDevice: device
        });
        this.setupDataTransfer(deviceId);
        wx.hideLoading();
        wx.showToast({
          title: '连接成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('连接失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '连接失败',
          icon: 'none'
        });
      }
    });
  },

  // 断开连接
  disconnect() {
    if (this.data.connectedDevice) {
      wx.closeBLEConnection({
        deviceId: this.data.connectedDevice.deviceId,
        success: () => {
          console.log('断开连接成功');
          this.setData({
            connected: false,
            connectedDevice: null,
            receivedData: []
          });
        }
      });
    }
  },

  // 设置数据传输
  setupDataTransfer(deviceId: string) {
    // 获取服务
    wx.getBLEDeviceServices({
      deviceId: deviceId,
      success: (res) => {
        // 查找目标服务
        const targetService = res.services.find(service => 
          service.uuid.toUpperCase().includes(this.data.serviceUUID)
        );
        
        if (targetService) {
          this.setupCharacteristic(deviceId, targetService.uuid);
        }
      }
    });
  },

  // 设置特征值
  setupCharacteristic(deviceId: string, serviceId: string) {
    wx.getBLEDeviceCharacteristics({
      deviceId: deviceId,
      serviceId: serviceId,
      success: (res) => {
        const targetCharacteristic = res.characteristics.find(char =>
          char.uuid.toUpperCase().includes(this.data.characteristicUUID)
        );

        if (targetCharacteristic) {
          // 启用通知
          if (targetCharacteristic.properties.notify) {
            wx.notifyBLECharacteristicValueChange({
              deviceId: deviceId,
              serviceId: serviceId,
              characteristicId: targetCharacteristic.uuid,
              state: true,
              success: () => {
                console.log('启用通知成功');
                this.listenForData();
              }
            });
          }
        }
      }
    });
  },

  // 监听数据接收
  listenForData() {
    wx.onBLECharacteristicValueChange((result) => {
      const data = this.arrayBufferToString(result.value);
      const newData = [...this.data.receivedData, `${new Date().toLocaleTimeString()}: ${data}`];
      this.setData({ receivedData: newData });
    });
  },

  // ArrayBuffer转字符串
  arrayBufferToString(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += String.fromCharCode(bytes[i]);
    }
    return result;
  },

  // 字符串转ArrayBuffer
  stringToArrayBuffer(str: string): ArrayBuffer {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return bytes.buffer;
  },

  // 输入框变化
  onMessageInput(e: any) {
    this.setData({ sendMessage: e.detail.value });
  },

  // 发送数据
  sendData() {
    if (!this.data.connected || !this.data.connectedDevice || !this.data.sendMessage.trim()) {
      wx.showToast({
        title: '请检查连接状态和输入内容',
        icon: 'none'
      });
      return;
    }

    const message = this.data.sendMessage;
    const buffer = this.stringToArrayBuffer(message);

    // 这里需要根据实际连接的特征值来发送
    // 暂时使用示例，实际需要保存连接时的serviceId和characteristicId
    wx.writeBLECharacteristicValue({
      deviceId: this.data.connectedDevice.deviceId,
      serviceId: `0000${this.data.serviceUUID}-0000-1000-8000-00805F9B34FB`,
      characteristicId: `0000${this.data.characteristicUUID}-0000-1000-8000-00805F9B34FB`,
      value: buffer,
      success: () => {
        console.log('发送成功:', message);
        const newData = [...this.data.receivedData, `发送: ${message}`];
        this.setData({ 
          receivedData: newData,
          sendMessage: ''
        });
      },
      fail: (err) => {
        console.error('发送失败:', err);
        wx.showToast({
          title: '发送失败',
          icon: 'none'
        });
      }
    });
  },

  // 清空接收数据
  clearData() {
    this.setData({ receivedData: [] });
  }
});