// bluetooth-manager.ts
export interface BluetoothDevice {
  deviceId: string;
  name: string;
  RSSI: number;
}

export class BluetoothManager {
  private deviceId: string = '';
  private serviceId: string = '';
  private characteristicId: string = '';

  // HC-08默认UUID
  private readonly HC08_SERVICE_UUID = 'FFE0';
  private readonly HC08_CHARACTERISTIC_UUID = 'FFE1';

  /**
   * 初始化蓝牙适配器
   */
  async initBluetooth(): Promise<boolean> {
    return new Promise((resolve) => {
      wx.openBluetoothAdapter({
        success: () => {
          console.log('蓝牙适配器初始化成功');
          resolve(true);
        },
        fail: (err) => {
          console.error('蓝牙适配器初始化失败:', err);
          resolve(false);
        }
      });
    });
  }

  /**
   * 扫描蓝牙设备
   */
  startScan(onDeviceFound: (devices: BluetoothDevice[]) => void): Promise<boolean> {
    return new Promise((resolve) => {
      const foundDevices: BluetoothDevice[] = [];

      wx.onBluetoothDeviceFound((result) => {
        result.devices.forEach(device => {
          if (device.name && !foundDevices.find(d => d.deviceId === device.deviceId)) {
            foundDevices.push({
              deviceId: device.deviceId,
              name: device.name,
              RSSI: device.RSSI
            });
            onDeviceFound([...foundDevices]);
          }
        });
      });

      wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
        success: () => {
          console.log('开始扫描蓝牙设备');
          resolve(true);
        },
        fail: (err) => {
          console.error('扫描失败:', err);
          resolve(false);
        }
      });
    });
  }

  /**
   * 停止扫描
   */
  stopScan(): void {
    wx.stopBluetoothDevicesDiscovery();
  }

  /**
   * 连接蓝牙设备
   */
  async connectDevice(deviceId: string): Promise<boolean> {
    this.deviceId = deviceId;
    
    return new Promise((resolve) => {
      wx.createBLEConnection({
        deviceId: deviceId,
        success: async () => {
          console.log('连接成功');
          const setupSuccess = await this.setupServices();
          resolve(setupSuccess);
        },
        fail: (err) => {
          console.error('连接失败:', err);
          resolve(false);
        }
      });
    });
  }

  /**
   * 设置服务和特征值
   */
  private async setupServices(): Promise<boolean> {
    try {
      // 获取服务
      const services = await this.getServices();
      const targetService = services.find(service => 
        service.uuid.toUpperCase().includes(this.HC08_SERVICE_UUID)
      );

      if (!targetService) {
        console.error('未找到目标服务');
        return false;
      }

      this.serviceId = targetService.uuid;

      // 获取特征值
      const characteristics = await this.getCharacteristics(this.serviceId);
      const targetCharacteristic = characteristics.find(char =>
        char.uuid.toUpperCase().includes(this.HC08_CHARACTERISTIC_UUID)
      );

      if (!targetCharacteristic) {
        console.error('未找到目标特征值');
        return false;
      }

      this.characteristicId = targetCharacteristic.uuid;

      // 启用通知
      if (targetCharacteristic.properties.notify) {
        await this.enableNotify();
      }

      return true;
    } catch (error) {
      console.error('设置服务失败:', error);
      return false;
    }
  }

  /**
   * 获取设备服务
   */
  private getServices(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceServices({
        deviceId: this.deviceId,
        success: (res) => resolve(res.services),
        fail: reject
      });
    });
  }

  /**
   * 获取服务特征值
   */
  private getCharacteristics(serviceId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceCharacteristics({
        deviceId: this.deviceId,
        serviceId: serviceId,
        success: (res) => resolve(res.characteristics),
        fail: reject
      });
    });
  }

  /**
   * 启用特征值通知
   */
  private enableNotify(): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.notifyBLECharacteristicValueChange({
        deviceId: this.deviceId,
        serviceId: this.serviceId,
        characteristicId: this.characteristicId,
        state: true,
        success: () => {
          console.log('启用通知成功');
          resolve();
        },
        fail: reject
      });
    });
  }

  /**
   * 监听数据接收
   */
  onDataReceived(callback: (data: string) => void): void {
    wx.onBLECharacteristicValueChange((result) => {
      const data = this.arrayBufferToString(result.value);
      callback(data);
    });
  }

  /**
   * 发送数据
   */
  async sendData(data: string): Promise<boolean> {
    if (!this.deviceId || !this.serviceId || !this.characteristicId) {
      console.error('设备未连接或服务未设置');
      return false;
    }

    const buffer = this.stringToArrayBuffer(data);

    return new Promise((resolve) => {
      wx.writeBLECharacteristicValue({
        deviceId: this.deviceId,
        serviceId: this.serviceId,
        characteristicId: this.characteristicId,
        value: buffer,
        success: () => {
          console.log('发送成功:', data);
          resolve(true);
        },
        fail: (err) => {
          console.error('发送失败:', err);
          resolve(false);
        }
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.deviceId) {
      wx.closeBLEConnection({
        deviceId: this.deviceId,
        success: () => {
          console.log('断开连接成功');
          this.deviceId = '';
          this.serviceId = '';
          this.characteristicId = '';
        }
      });
    }
  }

  /**
   * ArrayBuffer转字符串
   */
  private arrayBufferToString(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += String.fromCharCode(bytes[i]);
    }
    return result;
  }

  /**
   * 字符串转ArrayBuffer
   */
  private stringToArrayBuffer(str: string): ArrayBuffer {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return bytes.buffer;
  }
}