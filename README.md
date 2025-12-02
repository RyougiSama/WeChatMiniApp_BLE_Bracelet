# 蓝牙智能手环微信小程序

一款基于微信小程序平台开发的蓝牙低功耗(BLE)智能手环管理应用，支持与HC-08等蓝牙模块进行双向数据通信。

## 📋 项目概述

本项目是一个微信小程序，主要功能是通过蓝牙低功耗（BLE）技术连接智能手环设备，实现健康数据的查询与GPS位置同步等功能。

### 主要特性

- 🔍 **蓝牙设备扫描** - 自动扫描附近的BLE设备
- 📶 **设备连接管理** - 支持HC-08等蓝牙模块连接
- 📡 **双向数据通信** - 实时收发数据，支持ASCII/HEX格式显示
- 🌡️ **健康数据查询** - 温度、心率、步数等健康指标查询
- 🌍 **GPS位置同步** - 获取当前GPS位置并同步到手环设备
- 📍 **逆地理编码** - 支持高德地图API地址解析

## 🏗️ 项目架构

```
WeChatMiniApp_BLE_Bracelet/
├── package.json                 # 项目依赖配置
├── project.config.json          # 小程序项目配置
├── project.private.config.json  # 私有项目配置
├── tsconfig.json                # TypeScript编译配置
├── miniprogram/                 # 小程序主目录
│   ├── app.json                 # 小程序全局配置
│   ├── app.ts                   # 小程序入口文件
│   ├── app.wxss                 # 全局样式
│   ├── pages/                   # 页面目录
│   │   ├── index/               # 首页
│   │   │   ├── index.ts         # 首页逻辑
│   │   │   ├── index.wxml       # 首页结构
│   │   │   ├── index.wxss       # 首页样式
│   │   │   └── index.json       # 首页配置
│   │   └── bluetooth/           # 蓝牙功能页
│   │       ├── bluetooth.ts     # 蓝牙页面逻辑（核心）
│   │       ├── bluetooth.wxml   # 蓝牙页面结构
│   │       ├── bluetooth.wxss   # 蓝牙页面样式
│   │       └── bluetooth.json   # 蓝牙页面配置
│   └── utils/                   # 工具类目录
│       ├── bluetooth-manager.ts # 蓝牙管理器（封装类）
│       └── util.ts              # 通用工具函数
└── typings/                     # TypeScript类型声明
    ├── index.d.ts               # 全局类型声明
    └── types/                   # 微信API类型
        └── wx/                  # 微信小程序API类型
```

## 📁 文件详细说明

### 配置文件

| 文件 | 说明 |
|------|------|
| `package.json` | NPM包管理配置，包含TypeScript类型依赖 |
| `project.config.json` | 微信小程序项目配置，AppID: `wx7d89a91b9b580ed5` |
| `tsconfig.json` | TypeScript编译选项配置 |

### 小程序配置 (`miniprogram/app.json`)

```json
{
  "pages": [
    "pages/index/index",      // 首页（欢迎页）
    "pages/bluetooth/bluetooth" // 蓝牙功能页（核心）
  ],
  "window": {
    "navigationBarTitleText": "蓝牙智能手环",
    "navigationBarBackgroundColor": "#4c6ef5"
  },
  "permission": {
    "scope.userLocation": {
      "desc": "需要获取位置信息用于蓝牙设备扫描和GPS位置同步到智能手环"
    }
  }
}
```

### 核心页面

#### 首页 (`pages/index/`)

**功能**: 欢迎引导页面，展示应用功能介绍

- 展示应用名称、版本号
- 核心功能介绍卡片
- 提供进入蓝牙功能页的入口

#### 蓝牙页 (`pages/bluetooth/`)

**功能**: 核心功能页面，实现蓝牙设备管理和数据通信

主要功能模块：

| 模块 | 功能描述 |
|------|----------|
| 设备扫描 | 扫描附近BLE设备，显示设备名称和信号强度 |
| 连接管理 | 建立/断开蓝牙连接，状态监听 |
| 数据通信 | 发送指令、接收数据，支持ASCII/HEX显示 |
| 智能控制 | 预设快捷指令按钮（温度、心率、步数、定位、GPS同步） |

### 工具类

#### `bluetooth-manager.ts`

封装了蓝牙操作的管理类，提供：

- `initBluetooth()` - 初始化蓝牙适配器
- `startScan()` - 开始扫描设备
- `connectDevice()` - 连接指定设备
- `sendData()` - 发送数据
- `disconnect()` - 断开连接

#### `util.ts`

通用工具函数：

- `formatTime()` - 时间格式化

## 🔧 技术实现

### 蓝牙通信协议

本项目使用自定义二进制协议与手环通信：

**指令格式（4字节）：**

| 字节位置 | 名称 | 说明 |
|---------|------|------|
| Byte 0 | 帧头 | 固定为 `0xAA` |
| Byte 1 | 长度 | 数据包长度 |
| Byte 2 | 指令 | 指令编号 |
| Byte 3 | 校验 | 前3字节累加和低8位 |

**指令编号：**

| 指令 | 编号 | 说明 |
|------|------|------|
| 温度 | `0x01` | 查询温度数据 |
| 健康 | `0x02` | 查询综合健康数据 |
| 步数 | `0x03` | 查询步数统计 |
| 定位 | `0x04` | 查询位置信息 |
| GPS同步 | `0x05` | 发送当前GPS坐标到手环 |

**GPS数据包（12字节）：**

| 字节位置 | 内容 |
|---------|------|
| 0-2 | 帧头 + 长度 + 指令 |
| 3-6 | 纬度（小端序，×10^6整数） |
| 7-10 | 经度（小端序，×10^6整数） |
| 11 | 校验和 |

### 蓝牙服务UUID

适配HC-08蓝牙模块：

- **服务UUID**: `FFE0`
- **特征值UUID**: `FFE1`

### 数据接收优化

采用数据合并机制，解决BLE分包传输问题：

```typescript
// 数据缓存合并
this.dataBuffer += asciiData;
this.dataTimer = setTimeout(() => {
  // 合并后创建完整数据记录
}, this.mergeTimeout); // 默认300ms
```

## 🚀 开发环境

### 前置要求

- 微信开发者工具
- Node.js (用于TypeScript编译)

### 依赖安装

```bash
npm install
```

### 开发依赖

```json
{
  "devDependencies": {
    "miniprogram-api-typings": "^2.8.3-1"
  }
}
```

## 📱 运行方式

1. 使用微信开发者工具打开项目根目录
2. 编译TypeScript（工具自动处理）
3. 在模拟器或真机预览中运行

## ⚙️ 权限说明

| 权限 | 用途 |
|------|------|
| 蓝牙 | 扫描和连接BLE设备 |
| 位置 | 蓝牙扫描需要，以及GPS位置同步功能 |

## 🗺️ 外部服务

### 高德地图逆地理编码

用于将GPS坐标转换为可读地址：

```typescript
// API配置
url: 'https://restapi.amap.com/v3/geocode/regeo'
key: 'ffe4748c716e286bb3293ae3afcb77ac'
```

> 注意：正式环境请替换为自己的API Key，并配置域名白名单

## 📊 数据流程图

```
┌──────────────┐     BLE     ┌──────────────┐
│  微信小程序   │ ◄────────► │  智能手环     │
└──────────────┘             └──────────────┘
       │
       │ HTTP
       ▼
┌──────────────┐
│  高德地图API  │
└──────────────┘
```

## 🔒 安全说明

- 所有数据本地处理，不上传服务器
- 蓝牙通信仅限本地设备间传输
- 位置信息仅用于GPS同步功能

## 📝 版本信息

- **当前版本**: v2.0.0
- **基础库版本**: 3.10.2
- **AppID**: wx7d89a91b9b580ed5

## 📄 许可证

本项目遵循 MIT 许可证

---

**作者**: RyougiSama  
**仓库**: WeChatMiniApp_BLE_Bracelet
