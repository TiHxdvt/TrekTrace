# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

途迹（TrekTrace）是一个户外运动记录移动应用，支持徒步、跑步、骑行的轨迹记录与数据统计。采用前后端分离架构：

- **前端**: React Native + TypeScript（跨平台移动应用）
- **后端**: Spring Boot 3.2.5 + Java 17
- **数据库**: MySQL 8.0
- **地图SDK**: 高德地图（AMap）
- **认证**: JWT

## 常用命令

### 后端开发

```bash
# 进入后端目录
cd backend

# 运行开发服务器（端口 8080）
./mvnw spring-boot:run

# 编译项目
./mvnw clean compile

# 打包
./mvnw clean package

# 运行测试
./mvnw test

# 运行单个测试类
./mvnw test -Dtest=ClassName

# 运行单个测试方法
./mvnw test -Dtest=ClassName#methodName
```

### 前端开发

```bash
# 进入前端目录
cd app

# 安装依赖
npm install

# 启动 Metro bundler
npm start

# 运行 Android 版本
npm run android

# 运行 iOS 版本
npm run ios

# 代码检查
npm run lint

# 运行测试
npm test
```

### Git 提交规范

项目使用 Conventional Commits 格式：

```
feat: 添加新功能
fix: 修复 bug
chore: 杂项（配置、依赖更新等）
docs: 文档更新
refactor: 代码重构
test: 测试相关
```

## 环境配置

### 后端配置（application.yml）

关键配置项（使用环境变量）：

- `DB_PASSWORD`: 数据库密码（默认：whd123456）
- `JWT_SECRET`: JWT 密钥（生产环境必须修改）
- `SMS_PROVIDER`: 短信服务商（mock/aliyun/tencent）
- `ALIYUN_ACCESS_KEY_ID`: 阿里云 AccessKey（短信服务）
- `ALIYUN_ACCESS_KEY_SECRET`: 阿里云 Secret（短信服务）

数据库连接：
- URL: `jdbc:mysql://localhost:3306/trektrace`
- 时区: `Asia/Shanghai`
- JPA DDL: `update`（自动更新表结构）

### 前端配置

- Node.js: >= 22.11.0
- Android: Gradle 构建（已启用 Hermes 和新架构）
- iOS: CocoaPods 依赖管理

### 高德地图配置

Android API Key 已配置在 `app/android/app/src/main/AndroidManifest.xml`

## 架构说明

### 后端架构

采用标准的三层架构：

```
com.trektrace
├── entity/          # JPA 实体类（对应数据库表）
│   ├── User
│   ├── Activity     # 运动记录
│   ├── TrackPoint   # 轨迹点
│   └── VerificationCode
├── repository/      # Spring Data JPA 仓库接口
├── service/         # 业务逻辑层
├── controller/      # REST API 控制器
├── dto/             # 数据传输对象
├── config/          # 配置类（SecurityConfig 等）
└── util/            # 工具类（JwtUtil 等）
```

**核心实体关系**：
- User → Activity（一对多）
- Activity → TrackPoint（一对多）

### 前端架构

React Native 0.84.1 项目结构：

```
app/
├── android/         # Android 原生代码
├── ios/             # iOS 原生代码
├── App.tsx          # 应用入口
├── src/             # 业务代码（待开发）
├── package.json     # 依赖管理
└── tsconfig.json    # TypeScript 配置
```

**已集成**：
- 高德地图 3D SDK + 定位 SDK
- react-native-safe-area-context

## UI 设计规范

项目采用玻璃拟态（Glassmorphism）设计风格，深色主题。

### 核心颜色

- 主背景: `#1c1e26` (深空灰)
- 强调色: `#3b82f6` (钴蓝)
- 文本透明度: 100% / 80% / 50% / 40% / 30%

### 设计特点

- 半透明效果（背景 60% 透明度）
- 背景模糊（backdrop-blur-2xl: 24px）
- 柔和渐变和光晕效果
- G2 椭圆圆角系统
- 图标使用 Solar 图标集（通过 Iconify）

详细规范参见：`docs/style-guide-zh.md`

## 数据库结构

核心表（见 `docs/database-schema.sql`）：

1. **users**: 用户信息
2. **activities**: 运动记录（类型、时间、距离、爬升等）
3. **track_points**: GPS 轨迹点（经纬度、海拔、速度）
4. **verification_codes**: 短信验证码

## API 认证

- 使用 JWT Bearer Token 认证
- Token 有效期：7 天
- 登录流程：手机号 + 短信验证码

## 开发注意事项

1. **数据库**: 确保 MySQL 服务运行，数据库 `trektrace` 已创建
2. **后端端口**: 默认 8080，确保端口未被占用
3. **环境变量**: 生产环境必须设置 `JWT_SECRET`
4. **短信服务**: 开发环境默认使用 mock 提供者
5. **React Native**: 首次运行需要安装原生依赖（Android: Gradle sync / iOS: pod install）
