# 蓝牙智能手环 - 指令发送格式说明

## 📡 指令发送格式详解

### 1. 支持的数据格式

现在支持两种数据发送格式：
- **ASCII格式** - 发送可读文本指令
- **HEX格式** - 发送十六进制字节数据

### 2. 核心代码位置

#### 主要文件：`miniprogram/pages/bluetooth/bluetooth.ts`

**关键函数：**
- `sendData()` - 主发送函数（第390-442行）
- `stringToArrayBuffer()` - ASCII转换（第363-369行）
- `hexStringToArrayBuffer()` - HEX转换（第371-382行）
- `arrayBufferToString()` - 接收ASCII转换（第352-359行）
- `arrayBufferToHexString()` - 接收HEX转换（第384-391行）

### 3. 数据转换流程

#### ASCII模式发送流程：
```
用户输入: "heart_rate"
↓
ASCII码转换: [104, 101, 97, 114, 116, 95, 114, 97, 116, 101]
↓
ArrayBuffer发送到蓝牙设备
```

#### HEX模式发送流程：
```
用户输入: "01 02 03 FF"
↓
解析处理: 移除空格，转换为字节
↓
字节数组: [1, 2, 3, 255]
↓
ArrayBuffer发送到蓝牙设备
```

### 4. 使用方法

#### 4.1 ASCII模式（默认）
- **适用场景**：发送文本指令，如 "heart_rate", "steps", "battery"
- **输入示例**：
  - `heart_rate` - 查询心率
  - `get_steps` - 获取步数
  - `sync_data` - 同步数据

#### 4.2 HEX模式
- **适用场景**：发送二进制协议数据
- **输入格式**：支持多种HEX格式
  - `01 02 03` - 空格分隔
  - `010203` - 连续HEX
  - `0x01 0x02 0x03` - 0x前缀
- **输入示例**：
  - `AA BB CC` - 设备唤醒指令
  - `01 05 00 01` - 读取传感器数据
  - `FF FE FD` - 设备重置指令

### 5. 数据接收显示

接收到的数据会同时显示ASCII和HEX格式：
```
23:15:42 - ASCII: OK | HEX: 4F 4B
23:15:45 - ASCII: ♥72 | HEX: E2 99 A5 37 32
```

### 6. 快捷指令

预置的快捷指令（ASCII格式）：
- **心率** → `heart_rate`
- **步数** → `steps`
- **电量** → `battery`
- **同步** → `sync`

### 7. 蓝牙通信参数

```typescript
// 默认HC-08蓝牙模块参数
serviceUUID: 'FFE0'
characteristicUUID: 'FFE1'

// 完整UUID格式
serviceId: '0000FFE0-0000-1000-8000-00805F9B34FB'
characteristicId: '0000FFE1-0000-1000-8000-00805F9B34FB'
```

### 8. 格式切换

- 点击发送区域右上角的格式切换按钮
- 支持ASCII ↔ HEX模式实时切换
- 输入框placeholder会根据模式变化

### 9. 错误处理

- **ASCII模式**：检查字符串是否为空
- **HEX模式**：验证HEX格式是否正确
- **连接检查**：确保设备已连接
- **发送反馈**：显示发送成功/失败状态

### 10. 调试信息

发送时会在控制台输出：
```javascript
console.log('发送成功:', message, '格式:', this.data.dataFormat);
```

接收时显示完整的ASCII和HEX数据，便于调试和分析。

---

## 💡 使用建议

1. **智能手环**：通常使用ASCII指令，如 "heart_rate", "steps"
2. **工业设备**：可能需要HEX协议，如 "AA BB 01 CC"
3. **调试阶段**：建议同时查看ASCII和HEX格式的接收数据
4. **协议开发**：可以先用HEX模式测试原始数据，再封装为ASCII指令

## 🔧 扩展功能

当前实现支持：
- ✅ ASCII/HEX双格式发送
- ✅ 双格式接收显示
- ✅ 格式实时切换
- ✅ 快捷指令
- ✅ 错误验证
- ✅ 发送状态反馈

可进一步扩展：
- 📋 指令历史记录
- 🔄 自动重发机制
- 📊 数据解析显示
- 🎯 自定义协议支持