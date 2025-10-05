# 蓝牙智能手环通信协议

## 📡 数据包格式规范

### 标准指令包结构（4字节）

| 字节位置 | 字段名 | 固定值/范围 | 说明 |
|---------|--------|-------------|------|
| Byte 0 | 帧头 | 0xAA | 固定帧头标识 |
| Byte 1 | 数据长度 | 0x04 | 固定包长度4字节 |
| Byte 2 | 指令编号 | 0x01-0xFF | 具体指令标识 |
| Byte 3 | 校验和 | 计算值 | 前3字节之和的低8位 |

### 校验和计算公式
```
校验和 = (0xAA + 0x04 + 指令编号) & 0xFF
```

## 🎯 指令编号定义

| 指令名称 | 指令编号 | 完整数据包 | 功能说明 |
|---------|---------|-----------|----------|
| 心率查询 | 0x01 | AA 04 01 AF | 查询当前心率数据 |
| 步数查询 | 0x02 | AA 04 02 B0 | 查询当前步数数据 |
| 电量查询 | 0x03 | AA 04 03 B1 | 查询电池电量状态 |
| 数据同步 | 0x04 | AA 04 04 B2 | 同步所有健康数据 |

## 💻 代码实现

### 数据包构造函数
```typescript
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
  
  return packet.buffer;
}
```

### 指令编号映射
```typescript
getCommandCode(command: string): number {
  const commandMap: { [key: string]: number } = {
    'heart_rate': 0x01,  // 心率指令
    'steps': 0x02,       // 步数指令
    'battery': 0x03,     // 电量指令
    'sync': 0x04         // 同步指令
  };
  
  return commandMap[command] || 0x00;
}
```

## 📋 数据包示例

### 心率查询指令分析
```
原始指令: heart_rate
↓
指令编号: 0x01
↓
数据包构造:
  Byte 0: 0xAA (帧头)
  Byte 1: 0x04 (长度)
  Byte 2: 0x01 (心率指令)
  Byte 3: 0xAF (校验和: AA+04+01=AF)
↓
最终发送: [AA 04 01 AF]
```

### 校验和计算示例
```
心率指令 (0x01):
AA + 04 + 01 = AF (低8位)
校验: 0xAA + 0x04 + 0x01 = 0xAF ✓

步数指令 (0x02):
AA + 04 + 02 = B0 (低8位) 
校验: 0xAA + 0x04 + 0x02 = 0xB0 ✓

电量指令 (0x03):
AA + 04 + 03 = B1 (低8位)
校验: 0xAA + 0x04 + 0x03 = 0xB1 ✓

同步指令 (0x04):
AA + 04 + 04 = B2 (低8位)
校验: 0xAA + 0x04 + 0x04 = 0xB2 ✓
```

## 📤 发送流程

1. **用户点击快捷指令按钮**
2. **获取指令名称** (如: "heart_rate")
3. **映射到指令编号** (0x01)
4. **构造4字节数据包** [AA 04 01 AF]
5. **发送到蓝牙特征值**
6. **显示发送状态和HEX数据**

## 📥 接收处理

接收到的数据会同时显示ASCII和HEX格式：
```
发送指令: HEART_RATE [AA 04 01 AF]
23:15:42 - ASCII: ♥72 | HEX: E2 99 A5 37 32
```

## 🔧 扩展指令

如需添加新指令，只需：

1. **在指令映射中添加**：
```typescript
const commandMap = {
  'heart_rate': 0x01,
  'steps': 0x02,
  'battery': 0x03,
  'sync': 0x04,
  'temperature': 0x05,  // 新增体温指令
  'sleep': 0x06         // 新增睡眠指令
};
```

2. **在WXML中添加按钮**：
```xml
<button class="quick-btn" bindtap="sendQuickCommand" data-command="temperature">
  <view class="btn-content">
    <text class="btn-icon">🌡️</text>
    <text class="btn-label">体温</text>
    <text class="btn-code">0x05</text>
  </view>
</button>
```

3. **对应的数据包会自动生成**：
   - 体温指令: [AA 04 05 B3]
   - 睡眠指令: [AA 04 06 B4]

## ✅ 优势特点

- **标准化协议**：统一的4字节包格式
- **校验保护**：校验和确保数据完整性  
- **易于扩展**：新增指令只需修改映射表
- **调试友好**：显示完整的HEX数据包
- **错误处理**：连接检查和发送状态反馈