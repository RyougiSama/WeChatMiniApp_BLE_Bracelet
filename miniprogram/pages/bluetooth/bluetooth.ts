// bluetooth.ts
interface BluetoothDevice {
  deviceId: string;
  name: string;
  RSSI: number;
}

interface DataRecord {
  timestamp: string;
  type: 'send' | 'receive';
  command?: string;
  ascii: string;
  hex: string;
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
    receivedData: [] as DataRecord[],
    displayMode: 'ascii', // 显示模式：'ascii' 或 'hex'

    // 服务和特征值UUID (HC-08默认)
    serviceUUID: 'FFE0',
    characteristicUUID: 'FFE1'
  },

  // 数据缓存相关属性
  dataBuffer: '',
  hexBuffer: '',
  dataTimer: null as any,
  mergeTimeout: 300, // 数据合并超时时间(毫秒)，可根据设备调整

  onLoad() {
    this.initBluetooth();
    this.setupBluetoothListeners();
  },

  onShow() {
    // 页面显示时检查蓝牙状态
    this.checkBluetoothStatus();
  },

  onHide() {
    // 页面隐藏时停止扫描
    this.stopScan();
  },

  onUnload() {
    // 页面卸载时清理所有蓝牙相关资源
    this.cleanupBluetooth();
    this.clearDataTimer();
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

  // 设置蓝牙状态监听
  setupBluetoothListeners() {
    // 监听蓝牙适配器状态变化
    wx.onBluetoothAdapterStateChange((res) => {
      console.log('蓝牙适配器状态变化:', res);
      this.setData({ bluetoothEnabled: res.available });

      if (!res.available) {
        // 蓝牙关闭时清理连接
        this.setData({
          connected: false,
          connectedDevice: null,
          scanning: false,
          devices: [],
          receivedData: []
        });
      }
    });

    // 监听BLE连接状态变化
    wx.onBLEConnectionStateChange((res) => {
      console.log('BLE连接状态变化:', res);
      if (!res.connected) {
        // 连接断开时更新状态
        this.setData({
          connected: false,
          connectedDevice: null,
          receivedData: []
        });
        wx.showToast({
          title: '设备连接已断开',
          icon: 'none'
        });
      }
    });
  },

  // 检查蓝牙状态
  checkBluetoothStatus() {
    wx.getBluetoothAdapterState({
      success: (res) => {
        console.log('当前蓝牙状态:', res);
        this.setData({ bluetoothEnabled: res.available });

        if (!res.available) {
          wx.showToast({
            title: '请开启蓝牙',
            icon: 'none'
          });
        }
      },
      fail: () => {
        // 蓝牙适配器未初始化，重新初始化
        this.initBluetooth();
      }
    });
  },

  // 清理蓝牙资源
  cleanupBluetooth() {
    console.log('清理蓝牙资源');

    // 停止扫描
    this.stopScan();

    // 断开连接
    this.disconnect();

    // 移除所有监听器（传入空函数移除所有监听）
    try {
      wx.offBluetoothDeviceFound(() => { });
      wx.offBluetoothAdapterStateChange(() => { });
      wx.offBLEConnectionStateChange(() => { });
      wx.offBLECharacteristicValueChange(() => { });
    } catch (error) {
      console.log('移除监听器:', error);
    }

    // 关闭蓝牙适配器
    wx.closeBluetoothAdapter({
      success: () => {
        console.log('蓝牙适配器已关闭');
      },
      fail: (err) => {
        console.error('关闭蓝牙适配器失败:', err);
      }
    });
  },

  // 清理数据定时器
  clearDataTimer() {
    if (this.dataTimer) {
      clearTimeout(this.dataTimer);
      this.dataTimer = null;
    }
    // 清空缓存
    this.dataBuffer = '';
    this.hexBuffer = '';
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

    // 先停止之前的扫描
    this.stopScan();

    // 清空设备列表，重新开始
    this.setData({
      scanning: true,
      devices: []
    });

    console.log('开始扫描蓝牙设备');

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
      console.log('正在断开连接:', this.data.connectedDevice.name);

      // 清理数据定时器
      this.clearDataTimer();

      wx.closeBLEConnection({
        deviceId: this.data.connectedDevice.deviceId,
        success: () => {
          console.log('断开连接成功');
          this.setData({
            connected: false,
            connectedDevice: null,
            receivedData: [],
            displayMode: 'ascii'
          });
        },
        fail: (err) => {
          console.error('断开连接失败:', err);
          // 即使断开失败，也要重置状态
          this.setData({
            connected: false,
            connectedDevice: null,
            receivedData: [],
            displayMode: 'ascii'
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
      const asciiData = this.arrayBufferToString(result.value);
      const hexData = this.arrayBufferToHexString(result.value);

      // 将数据添加到缓存中
      this.dataBuffer += asciiData;
      this.hexBuffer += (this.hexBuffer ? ' ' : '') + hexData;

      // 清除之前的定时器
      if (this.dataTimer) {
        clearTimeout(this.dataTimer);
      }

      // 设置新的定时器，合并数据
      this.dataTimer = setTimeout(() => {
        if (this.dataBuffer || this.hexBuffer) {
          const timeStamp = new Date().toLocaleTimeString();

          // 创建合并后的数据记录
          const dataRecord: DataRecord = {
            timestamp: timeStamp,
            type: 'receive',
            ascii: this.dataBuffer,
            hex: this.hexBuffer
          };

          const newData = [...this.data.receivedData, dataRecord];
          this.setData({ receivedData: newData });

          // 清空缓存
          this.dataBuffer = '';
          this.hexBuffer = '';
        }
        this.dataTimer = null;
      }, this.mergeTimeout);
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

  // ArrayBuffer转HEX字符串
  arrayBufferToHexString(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += bytes[i].toString(16).padStart(2, '0').toUpperCase() + ' ';
    }
    return result.trim();
  },



  // 刷新扫描
  refreshScan() {
    console.log('刷新扫描设备');
    this.startScan();
  },

  // 清空接收数据
  clearData() {
    this.clearDataTimer();
    this.setData({ receivedData: [] });
  },

  // 切换显示模式
  toggleDisplayMode() {
    const newMode = this.data.displayMode === 'ascii' ? 'hex' : 'ascii';
    this.setData({ displayMode: newMode });

    wx.showToast({
      title: `切换到${newMode === 'ascii' ? 'ASCII' : 'HEX'}模式`,
      icon: 'success',
      duration: 1000
    });
  },

  // 构造标准指令数据包
  buildCommandPacket(commandCode: number): ArrayBuffer {
    const frameHeader = 0xAA;      // 帧头
    const dataLength = 0x04;       // 指令长度
    const commandId = commandCode; // 指令编号

    // 计算校验和（AA + 04 + 指令编号，取低8位）
    const checksum = (frameHeader + dataLength + commandId) & 0xFF;

    // 构造4字节数据包
    const packet = new Uint8Array(4);
    packet[0] = frameHeader;  // 0xAA
    packet[1] = dataLength;   // 0x04
    packet[2] = commandId;    // 指令编号
    packet[3] = checksum;     // 校验和

    console.log(`构造指令包: [${packet[0].toString(16).toUpperCase()}, ${packet[1].toString(16).toUpperCase()}, ${packet[2].toString(16).toUpperCase()}, ${packet[3].toString(16).toUpperCase()}]`);

    return packet.buffer;
  },

  // 获取指令编号映射
  getCommandCode(command: string): number {
    const commandMap: { [key: string]: number } = {
      'temperature': 0x01, // 温度指令
      'heart_rate': 0x02,  // 健康数据指令
      'steps': 0x03,       // 步数指令
      'location': 0x04,    // 定位指令
      'gps_sync': 0x05     // GPS同步指令
    };

    return commandMap[command] || 0x01;
  },

  // 发送快捷指令
  sendQuickCommand(e: any) {
    const command = e.currentTarget.dataset.command;
    if (!command) return;

    if (!this.data.connected || !this.data.connectedDevice) {
      wx.showToast({
        title: '请先连接设备',
        icon: 'none'
      });
      return;
    }

    // GPS同步指令特殊处理
    if (command === 'gps_sync') {
      this.sendGPSLocation();
      return;
    }

    // 定位查询指令特殊处理
    if (command === 'location') {
      this.queryLocation();
      return;
    }

    // 获取指令编号
    const commandCode = this.getCommandCode(command);
    if (commandCode === 0x00) {
      wx.showToast({
        title: '未知指令',
        icon: 'none'
      });
      return;
    }

    // 构造标准数据包
    const packetBuffer = this.buildCommandPacket(commandCode);

    // 生成HEX显示字符串
    const hexBytes = new Uint8Array(packetBuffer);
    const hexString = Array.from(hexBytes)
      .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');

    // 直接发送数据包
    wx.writeBLECharacteristicValue({
      deviceId: this.data.connectedDevice.deviceId,
      serviceId: `0000${this.data.serviceUUID}-0000-1000-8000-00805F9B34FB`,
      characteristicId: `0000${this.data.characteristicUUID}-0000-1000-8000-00805F9B34FB`,
      value: packetBuffer,
      success: () => {
        console.log(`发送${command}指令成功:`, hexString);
        const timeStamp = new Date().toLocaleTimeString();

        // 创建发送数据记录
        const dataRecord: DataRecord = {
          timestamp: timeStamp,
          type: 'send',
          command: command.toUpperCase(),
          ascii: command.toUpperCase(),
          hex: hexString
        };

        const newData = [...this.data.receivedData, dataRecord];
        this.setData({ receivedData: newData });

        wx.showToast({
          title: `${command}指令已发送`,
          icon: 'success',
          duration: 1500
        });
      },
      fail: (err) => {
        console.error(`发送${command}指令失败:`, err);
        wx.showToast({
          title: '指令发送失败',
          icon: 'none'
        });
      }
    });
  },

  // 定位查询（只显示位置信息，不发送到设备）
  queryLocation() {
    wx.showLoading({ title: '获取位置中...' });

    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: async (res) => {
        console.log('查询到位置:', res.latitude, res.longitude, '精度:', res.accuracy);

        // 获取地址信息（使用高德API获取详细地址）
        wx.showLoading({ title: '解析地址中...' });
        const address = await this.reverseGeocode(res.latitude, res.longitude);
        console.log('地址信息:', address);

        wx.hideLoading();

        // 创建查询记录
        const timeStamp = new Date().toLocaleTimeString();
        const latDir = res.latitude >= 0 ? 'N' : 'S';
        const lngDir = res.longitude >= 0 ? 'E' : 'W';
        const locationStr = `${latDir} ${Math.abs(res.latitude).toFixed(6)}°, ${lngDir} ${Math.abs(res.longitude).toFixed(6)}°`;

        const dataRecord: DataRecord = {
          timestamp: timeStamp,
          type: 'send',
          command: 'LOCATION_QUERY',
          ascii: `定位查询: ${locationStr}\n地址: ${address}`,
          hex: 'AA 04 04 B2' // 定位查询指令
        };

        this.setData({
          receivedData: [...this.data.receivedData, dataRecord]
        });

        // 显示详细的位置信息
        wx.showModal({
          title: '当前位置信息',
          content: `坐标: ${locationStr}\n地址: ${address}\n精度: ±${res.accuracy}米`,
          showCancel: false,
          confirmText: '确定'
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取位置失败:', err);

        let errorMsg = '获取位置失败';
        if (err.errMsg.includes('auth deny')) {
          errorMsg = '请授权位置权限';
        } else if (err.errMsg.includes('timeout')) {
          errorMsg = '定位超时，请重试';
        }

        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  // 构造GPS数据包
  buildGPSPacket(latitude: number, longitude: number): ArrayBuffer {
    const frameHeader = 0xAA;
    const dataLength = 0x0C;  // 12字节
    const commandId = 0x05;   // GPS指令

    // 转换为整数 (×10^6)
    const latInt = Math.round(latitude * 1000000);
    const lngInt = Math.round(longitude * 1000000);

    // 构造12字节数据包
    const packet = new Uint8Array(12);
    packet[0] = frameHeader;
    packet[1] = dataLength;
    packet[2] = commandId;

    // 纬度 (小端序)
    packet[3] = latInt & 0xFF;
    packet[4] = (latInt >> 8) & 0xFF;
    packet[5] = (latInt >> 16) & 0xFF;
    packet[6] = (latInt >> 24) & 0xFF;

    // 经度 (小端序)
    packet[7] = lngInt & 0xFF;
    packet[8] = (lngInt >> 8) & 0xFF;
    packet[9] = (lngInt >> 16) & 0xFF;
    packet[10] = (lngInt >> 24) & 0xFF;

    // 计算校验和（参考buildCommandPacket的方式，使用相加求和）
    let checksum = 0;
    for (let i = 0; i < 11; i++) {
      checksum += packet[i];
    }
    packet[11] = checksum & 0xFF;  // 取低8位

    console.log(`构造GPS数据包: 纬度${latitude}°, 经度${longitude}°`);
    console.log(`编码后: 纬度${latInt}, 经度${lngInt}`);

    return packet.buffer;
  },

  // 逆地理编码：根据经纬度获取地址信息
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    // 方案1: 使用高德地图API（推荐，需要申请Key）
    const useAPI = true; // 设置为true启用API，需要配置Key和域名白名单

    if (useAPI) {
      return new Promise((resolve) => {
        wx.request({
          url: 'https://restapi.amap.com/v3/geocode/regeo',
          data: {
            location: `${longitude},${latitude}`,
            key: 'ffe4748c716e286bb3293ae3afcb77ac', // 高德地图Web服务API Key
            extensions: 'base'
          },
          success: (res: any) => {
            console.log('高德地图API响应:', res);
            if (res.data.status === '1' && res.data.regeocode) {
              const formatted = res.data.regeocode.formatted_address;
              resolve(formatted);
            } else {
              console.error('地址解析失败:', res.data);
              resolve('地址解析失败');
            }
          },
          fail: (err) => {
            console.error('请求高德API失败:', err);
            resolve('地址解析失败');
          }
        });
      });
    }

    // 方案2: 简化版本 - 根据经纬度范围粗略判断位置（无需API Key）
    return this.getLocationByCoordinates(latitude, longitude);
  },

  // 简化的位置判断（无需API，根据坐标范围判断）
  getLocationByCoordinates(lat: number, lng: number): string {
    // 中国主要城市坐标范围
    const regions = [
      { name: '北京市', latMin: 39.4, latMax: 41.1, lngMin: 115.7, lngMax: 117.5 },
      { name: '上海市', latMin: 30.7, latMax: 31.6, lngMin: 120.9, lngMax: 122.1 },
      { name: '广州市', latMin: 22.5, latMax: 23.9, lngMin: 112.9, lngMax: 114.0 },
      { name: '深圳市', latMin: 22.4, latMax: 22.9, lngMin: 113.7, lngMax: 114.6 },
      { name: '杭州市', latMin: 29.2, latMax: 30.6, lngMin: 118.3, lngMax: 120.9 },
      { name: '成都市', latMin: 30.1, latMax: 31.4, lngMin: 102.9, lngMax: 104.9 },
      { name: '武汉市', latMin: 29.9, latMax: 31.4, lngMin: 113.7, lngMax: 115.1 },
      { name: '西安市', latMin: 33.7, latMax: 34.8, lngMin: 107.7, lngMax: 109.8 },
      { name: '重庆市', latMin: 28.1, latMax: 32.2, lngMin: 105.3, lngMax: 110.2 },
      { name: '天津市', latMin: 38.6, latMax: 40.3, lngMin: 116.7, lngMax: 118.1 },
      { name: '南京市', latMin: 31.2, latMax: 32.6, lngMin: 118.4, lngMax: 119.2 },
      { name: '苏州市', latMin: 30.8, latMax: 32.0, lngMin: 119.9, lngMax: 121.4 },
    ];

    // 检查是否在已知城市范围内
    for (const region of regions) {
      if (lat >= region.latMin && lat <= region.latMax &&
        lng >= region.lngMin && lng <= region.lngMax) {
        return region.name;
      }
    }

    // 根据大范围判断省份/地区
    if (lat >= 3 && lat <= 53 && lng >= 73 && lng <= 135) {
      if (lng >= 73 && lng <= 96) return '西藏/新疆地区';
      if (lat >= 45) return '东北地区';
      if (lat <= 23) return '华南地区';
      if (lng <= 108) return '西部地区';
      if (lng >= 119) return '华东沿海地区';
      return '中部地区';
    }

    return `未知区域 (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`;
  },

  // 发送GPS位置
  sendGPSLocation() {
    if (!this.data.connected || !this.data.connectedDevice) {
      wx.showToast({
        title: '请先连接设备',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '获取位置中...' });

    // 请求位置权限并获取位置
    wx.getLocation({
      type: 'gcj02', // 国测局坐标系
      isHighAccuracy: true, // 高精度定位
      success: async (res) => {
        console.log('获取到位置:', res.latitude, res.longitude, '精度:', res.accuracy);

        // 获取地址信息
        wx.showLoading({ title: '解析地址中...' });
        const address = await this.reverseGeocode(res.latitude, res.longitude);
        console.log('地址信息:', address);

        // 构造GPS数据包
        const gpsPacket = this.buildGPSPacket(res.latitude, res.longitude);

        // 发送数据包
        wx.writeBLECharacteristicValue({
          deviceId: this.data.connectedDevice!.deviceId,
          serviceId: `0000${this.data.serviceUUID}-0000-1000-8000-00805F9B34FB`,
          characteristicId: `0000${this.data.characteristicUUID}-0000-1000-8000-00805F9B34FB`,
          value: gpsPacket,
          success: () => {
            wx.hideLoading();

            // 生成HEX显示字符串
            const hexBytes = new Uint8Array(gpsPacket);
            const hexString = Array.from(hexBytes)
              .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
              .join(' ');

            // 创建发送记录
            const timeStamp = new Date().toLocaleTimeString();
            const latDir = res.latitude >= 0 ? 'N' : 'S';
            const lngDir = res.longitude >= 0 ? 'E' : 'W';
            const locationStr = `${latDir} ${Math.abs(res.latitude).toFixed(6)}°, ${lngDir} ${Math.abs(res.longitude).toFixed(6)}°`;

            const dataRecord: DataRecord = {
              timestamp: timeStamp,
              type: 'send',
              command: 'GPS_SYNC',
              ascii: `GPS同步: ${locationStr}\n地址: ${address}`,
              hex: hexString
            };

            this.setData({
              receivedData: [...this.data.receivedData, dataRecord]
            });

            // 显示详细的位置信息
            wx.showModal({
              title: 'GPS位置已同步',
              content: `坐标: ${locationStr}\n地址: ${address}`,
              showCancel: false,
              confirmText: '确定'
            });
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('发送GPS位置失败:', err);
            wx.showToast({
              title: '位置同步失败',
              icon: 'none'
            });
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取位置失败:', err);

        let errorMsg = '获取位置失败';
        if (err.errMsg.includes('auth deny')) {
          errorMsg = '请授权位置权限';
        } else if (err.errMsg.includes('timeout')) {
          errorMsg = '定位超时，请重试';
        }

        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });
      }
    });
  },


});