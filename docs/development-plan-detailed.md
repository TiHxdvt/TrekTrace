# 途迹 TrekTrace - 详细开发计划

> **创建时间:** 2026-04-07
> **状态:** 待执行
> **预估总工期:** 3-4 周（业余时间）

---

## 📋 项目状态概览

### ✅ 已完成
- [x] 项目初始化（前端 + 后端）
- [x] 数据库设计
- [x] 后端基础架构（Entity, Repository, Service, Controller）
- [x] 高德地图 SDK 集成（Android）
- [x] JWT 认证工具类
- [x] Spring Security 配置
- [x] 用户登录 API（发送验证码 + 登录）

### 🚧 进行中
- [ ] 无

### ⏳ 待开始
- [ ] 前端页面开发
- [ ] 运动记录核心功能
- [ ] 数据统计功能
- [ ] 部署配置

---

## 🎯 开发优先级

### P0 - 核心功能（必须完成）
1. 用户登录前端页面
2. GPS 定位服务
3. 运动记录页面（地图 + 实时数据）
4. 活动列表和详情
5. 基础统计页面

### P1 - 重要功能（强烈建议）
1. 数据导出（GPX）
2. 离线数据存储
3. 后台运行支持
4. 优化和性能调优

### P2 - 次要功能（时间允许）
1. 高级统计图表
2. 个性化设置
3. 分享功能

---

## 📅 第一周：用户系统与导航框架

### Day 1-2: 前端基础架构

#### Task 1.1: 前端依赖安装与配置
**优先级:** P0
**预估时间:** 1 小时
**文件:**
- 修改: `app/package.json`
- 修改: `app/tsconfig.json`
- 新建: `app/src/types/index.ts`

**步骤:**
1. 安装核心依赖
   ```bash
   cd app
   npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
   npm install axios @react-native-async-storage/async-storage
   npm install react-native-maps react-native-geolocation-service
   npm install react-native-vector-icons
   npm install date-fns
   ```

2. 配置 TypeScript 类型定义
   ```typescript
   // src/types/index.ts
   export interface User {
     id: number;
     phone: string;
     nickname?: string;
     avatarUrl?: string;
     createdAt: string;
   }

   export interface Activity {
     id: number;
     type: 'HIKING' | 'RUNNING' | 'CYCLING';
     startTime: string;
     endTime?: string;
     duration?: number;
     distance?: number;
     elevationGain?: number;
     status: 'ONGOING' | 'PAUSED' | 'COMPLETED';
   }

   export interface TrackPoint {
     latitude: number;
     longitude: number;
     altitude?: number;
     timestamp: string;
     speed?: number;
   }
   ```

3. 提交代码
   ```bash
   git add .
   git commit -m "chore: install frontend dependencies and add type definitions"
   ```

---

#### Task 1.2: API 服务封装
**优先级:** P0
**预估时间:** 1.5 小时
**文件:**
- 新建: `app/src/services/api.ts`
- 新建: `app/src/services/authService.ts`
- 新建: `app/src/services/storageService.ts`

**步骤:**
1. 创建 API 客户端
   ```typescript
   // src/services/api.ts
   import axios from 'axios';
   import AsyncStorage from '@react-native-async-storage/async-storage';

   const API_BASE_URL = 'http://localhost:8080/api';

   const api = axios.create({
     baseURL: API_BASE_URL,
     timeout: 10000,
     headers: {
       'Content-Type': 'application/json',
     },
   });

   // 请求拦截器 - 添加 token
   api.interceptors.request.use(async (config) => {
     const token = await AsyncStorage.getItem('token');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });

   export default api;
   ```

2. 创建认证服务
   ```typescript
   // src/services/authService.ts
   import api from './api';

   export const authService = {
     sendVerificationCode: (phone: string) =>
       api.post('/auth/send-code', { phone }),

     login: (phone: string, code: string) =>
       api.post('/auth/login', { phone, code }),
   };
   ```

3. 创建本地存储服务
   ```typescript
   // src/services/storageService.ts
   import AsyncStorage from '@react-native-async-storage/async-storage';

   export const storageService = {
     saveToken: (token: string) => AsyncStorage.setItem('token', token),
     getToken: () => AsyncStorage.getItem('token'),
     removeToken: () => AsyncStorage.removeItem('token'),
     saveUser: (user: any) => AsyncStorage.setItem('user', JSON.stringify(user)),
     getUser: async () => {
       const user = await AsyncStorage.getItem('user');
       return user ? JSON.parse(user) : null;
     },
   };
   ```

4. 提交代码
   ```bash
   git add .
   git commit -m "feat: add API service and storage service"
   ```

---

#### Task 1.3: 登录页面 UI
**优先级:** P0
**预估时间:** 3 小时
**文件:**
- 新建: `app/src/screens/LoginScreen.tsx`
- 新建: `app/src/components/PhoneInput.tsx`
- 新建: `app/src/components/Button.tsx`

**UI 设计要点:**
- 遵循玻璃拟态设计风格（见 `docs/style-guide-zh.md`）
- 深色背景（#1c1e26）
- 半透明输入框（rgba(255, 255, 255, 0.05)）
- 蓝色主按钮（#3b82f6）
- 60 秒倒计时验证码按钮

**步骤:**
1. 创建通用组件
   - PhoneInput 组件（手机号输入框）
   - Button 组件（主要/次要按钮）

2. 实现登录页面
   - 手机号输入
   - 验证码输入
   - 获取验证码按钮（带倒计时）
   - 登录按钮

3. 实现业务逻辑
   - 表单验证（手机号格式）
   - 调用发送验证码 API
   - 调用登录 API
   - 存储 token 和用户信息
   - 导航到主页

4. 测试登录流程
   - 输入手机号
   - 点击获取验证码（后端控制台查看）
   - 输入验证码
   - 点击登录

5. 提交代码
   ```bash
   git add .
   git commit -m "feat: implement login screen with glassmorphism design"
   ```

---

### Day 3-4: 导航框架搭建

#### Task 1.4: 主导航框架
**优先级:** P0
**预估时间:** 2 小时
**文件:**
- 新建: `app/src/navigation/AppNavigator.tsx`
- 新建: `app/src/navigation/types.ts`
- 修改: `app/App.tsx`

**导航结构:**
```
App
├── AuthStack (未登录)
│   └── LoginScreen
└── MainTabNavigator (已登录)
    ├── ActivityTab (运动记录)
    ├── HistoryTab (历史记录)
    ├── StatsTab (数据统计)
    └── ProfileTab (个人中心)
```

**步骤:**
1. 定义导航类型
   ```typescript
   // src/navigation/types.ts
   export type AuthStackParamList = {
     Login: undefined;
   };

   export type MainTabParamList = {
     Activity: undefined;
     History: undefined;
     Stats: undefined;
     Profile: undefined;
   };
   ```

2. 创建底部 Tab 导航
   - 使用 @react-navigation/bottom-tabs
   - 4 个 Tab：记录、历史、统计、我的
   - 图标使用 react-native-vector-icons

3. 实现认证状态管理
   - 检查本地是否有 token
   - 有 token → 显示 MainTabNavigator
   - 无 token → 显示 AuthStack

4. 提交代码
   ```bash
   git add .
   git commit -m "feat: setup navigation structure with auth flow"
   ```

---

#### Task 1.5: 占位页面创建
**优先级:** P0
**预估时间:** 1 小时
**文件:**
- 新建: `app/src/screens/ActivityScreen.tsx`
- 新建: `app/src/screens/HistoryScreen.tsx`
- 新建: `app/src/screens/StatsScreen.tsx`
- 新建: `app/src/screens/ProfileScreen.tsx`

**步骤:**
1. 创建 4 个占位页面
   - 简单的标题和描述文字
   - 遵循玻璃拟态设计

2. 集成到导航

3. 提交代码
   ```bash
   git add .
   git commit -m "feat: add placeholder screens for main tabs"
   ```

---

## 📅 第二周：运动记录核心功能

### Day 5-6: GPS 定位服务

#### Task 2.1: 权限申请模块
**优先级:** P0
**预估时间:** 1.5 小时
**文件:**
- 新建: `app/src/utils/permissions.ts`
- 修改: `app/android/app/src/main/AndroidManifest.xml`

**Android 权限:**
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

**步骤:**
1. 封装权限请求函数
   ```typescript
   // src/utils/permissions.ts
   import { PermissionsAndroid, Platform } from 'react-native';

   export const requestLocationPermission = async (): Promise<boolean> => {
     if (Platform.OS === 'android') {
       const granted = await PermissionsAndroid.request(
         PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
       );
       return granted === PermissionsAndroid.RESULTS.GRANTED;
     }
     return true;
   };
   ```

2. 提交代码
   ```bash
   git add .
   git commit -m "feat: add location permission request"
   ```

---

#### Task 2.2: GPS 定位服务封装
**优先级:** P0
**预估时间:** 3 小时
**文件:**
- 新建: `app/src/services/LocationService.ts`
- 新建: `app/src/hooks/useLocation.ts`

**功能要求:**
1. 单次定位
2. 持续定位（间隔 1-2 秒）
3. 计算两点之间的距离（Haversine 公式）
4. 计算配速、时速
5. 后台定位支持

**步骤:**
1. 封装高德定位 SDK
   ```typescript
   // src/services/LocationService.ts
   import Geolocation from 'react-native-geolocation-service';

   export class LocationService {
     private watchId: number | null = null;

     // 获取当前位置
     getCurrentPosition(): Promise<TrackPoint> {
       return new Promise((resolve, reject) => {
         Geolocation.getCurrentPosition(
           (position) => {
             resolve({
               latitude: position.coords.latitude,
               longitude: position.coords.longitude,
               altitude: position.coords.altitude || undefined,
               timestamp: new Date(position.timestamp).toISOString(),
               speed: position.coords.speed || undefined,
             });
           },
           reject,
           { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
         );
       });
     }

     // 开始持续定位
     startTracking(callback: (point: TrackPoint) => void): void {
       this.watchId = Geolocation.watchPosition(
         (position) => {
           callback({
             latitude: position.coords.latitude,
             longitude: position.coords.longitude,
             altitude: position.coords.altitude || undefined,
             timestamp: new Date(position.timestamp).toISOString(),
             speed: position.coords.speed || undefined,
           });
         },
         (error) => console.error(error),
         {
           enableHighAccuracy: true,
           distanceFilter: 5, // 5米更新一次
           interval: 2000, // 2秒更新一次
         }
       );
     }

     // 停止定位
     stopTracking(): void {
       if (this.watchId !== null) {
         Geolocation.clearWatch(this.watchId);
         this.watchId = null;
       }
     }
   }
   ```

2. 创建自定义 Hook
   ```typescript
   // src/hooks/useLocation.ts
   export const useLocation = () => {
     // 追踪状态管理
   };
   ```

3. 测试定位功能
   - 室内测试（精度较低）
   - 室外测试（精度较高）
   - 移动测试（轨迹连续性）

4. 提交代码
   ```bash
   git add .
   git commit -m "feat: implement location service with continuous tracking"
   ```

---

### Day 7-8: 运动记录页面

#### Task 2.3: 地图组件
**优先级:** P0
**预估时间:** 3 小时
**文件:**
- 新建: `app/src/components/MapView.tsx`
- 新建: `app/src/components/TrackPolyline.tsx`

**功能要求:**
1. 显示当前位置标记
2. 绘制轨迹线（使用 Polyline）
3. 自动调整视野（fitToCoordinates）
4. 地图样式（卫星/标准/夜间）

**步骤:**
1. 封装高德地图组件
2. 实现轨迹绘制
3. 实现自动居中
4. 提交代码
   ```bash
   git add .
   git commit -m "feat: add map component with track polyline"
   ```

---

#### Task 2.4: 运动数据面板
**优先级:** P0
**预估时间:** 2 小时
**文件:**
- 新建: `app/src/components/ActivityDataPanel.tsx`
- 新建: `app/src/utils/calculations.ts`

**显示数据:**
1. 总距离（km）
2. 总时长（mm:ss）
3. 配速/时速
4. 海拔爬升（m）
5. 当前速度
6. 当前海拔

**计算逻辑:**
```typescript
// src/utils/calculations.ts
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  // Haversine 公式
  const R = 6371; // 地球半径（km）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // 返回米
};

export const calculatePace = (distance: number, duration: number): string => {
  // 配速（分/公里）
  if (distance === 0) return '0\'00"';
  const pace = (duration / 60) / (distance / 1000);
  const minutes = Math.floor(pace);
  const seconds = Math.floor((pace - minutes) * 60);
  return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
};
```

---

#### Task 2.5: 运动控制按钮
**优先级:** P0
**预估时间:** 2 小时
**文件:**
- 修改: `app/src/screens/ActivityScreen.tsx`
- 新建: `app/src/components/ActivityControls.tsx`

**按钮状态:**
1. 初始状态: [开始运动]
2. 进行中: [暂停] [结束]
3. 已暂停: [继续] [结束]

**逻辑:**
- 开始 → 请求权限 → 开始定位 → 创建后端活动记录
- 暂停 → 停止定位 → 保持数据
- 继续 → 恢复定位
- 结束 → 停止定位 → 上传数据 → 更新后端活动状态

---

#### Task 2.6: 运动类型选择
**优先级:** P0
**预估时间:** 1.5 小时
**文件:**
- 新建: `app/src/components/ActivityTypeSelector.tsx`

**运动类型:**
- 徒步 (HIKING)
- 跑步 (RUNNING)
- 骑行 (CYCLING)

**UI:**
- 3 个图标按钮
- 选中状态高亮
- 遵循玻璃拟态设计

---

#### Task 2.7: 数据上传服务
**优先级:** P0
**预估时间:** 2 小时
**文件:**
- 新建: `app/src/services/ActivityService.ts`

**上传策略:**
1. 活动开始: 创建活动记录
   ```typescript
   POST /api/activities
   Body: { type: 'HIKING', startTime: '2026-04-07T10:00:00Z' }
   Response: { id: 123, ... }
   ```

2. 活动进行中: 每 10 秒批量上传轨迹点
   ```typescript
   POST /api/activities/123/points
   Body: { points: [ ... ] }
   ```

3. 活动结束: 更新活动信息
   ```typescript
   PUT /api/activities/123
   Body: {
     endTime: '2026-04-07T12:30:00Z',
     duration: 9000,
     distance: 5000.5,
     elevationGain: 150.3,
     status: 'COMPLETED'
   }
   ```

**步骤:**
1. 实现 API 调用
2. 实现离线缓存（网络失败时）
3. 实现重试机制
4. 提交代码
   ```bash
   git add .
   git commit -m "feat: implement activity data upload service"
   ```

---

## 📅 第三周：数据统计与历史记录

### Day 9-10: 历史记录功能

#### Task 3.1: 活动列表 API 集成
**优先级:** P0
**预估时间:** 1 小时
**文件:**
- 修改: `app/src/services/ActivityService.ts`

**API:**
```typescript
GET /api/activities?page=1&size=20&type=HIKING
Response: {
  activities: [...],
  total: 50,
  page: 1,
  size: 20
}
```

---

#### Task 3.2: 历史记录列表页面
**优先级:** P0
**预估时间:** 3 小时
**文件:**
- 修改: `app/src/screens/HistoryScreen.tsx`
- 新建: `app/src/components/ActivityCard.tsx`
- 新建: `app/src/components/FilterBar.tsx`

**功能:**
1. 活动列表展示
2. 下拉刷新
3. 上拉加载更多
4. 按运动类型筛选
5. 按时间排序

**卡片信息:**
- 运动类型图标
- 日期时间
- 距离
- 时长
- 配速/时速

---

#### Task 3.3: 活动详情页面
**优先级:** P0
**预估时间:** 4 小时
**文件:**
- 新建: `app/src/screens/ActivityDetailScreen.tsx`
- 新建: `app/src/components/ElevationChart.tsx`

**功能:**
1. 地图轨迹回放
2. 详细数据展示
3. 海拔曲线图（使用 react-native-chart-kit）
4. GPX 导出

**GPX 导出格式:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>徒步活动 2026-04-07</name>
    <trkseg>
      <trkpt lat="39.9042" lon="116.4074">
        <ele>50.0</ele>
        <time>2026-04-07T10:00:00Z</time>
      </trkpt>
      <!-- 更多轨迹点 -->
    </trkseg>
  </trk>
</gpx>
```

---

### Day 11-12: 统计功能

#### Task 3.4: 统计数据 API
**优先级:** P0
**预估时间:** 1.5 小时
**文件:**
- 修改: `app/src/services/ActivityService.ts`

**API:**
```typescript
GET /api/stats/summary
Response: {
  totalDistance: 12345.6,  // 总距离（米）
  totalDuration: 360000,    // 总时长（秒）
  totalActivities: 15,      // 总活动数
  totalElevationGain: 1500.5, // 总爬升（米）
  byType: {
    HIKING: { count: 5, distance: 5000, duration: 10000 },
    RUNNING: { count: 7, distance: 4200, duration: 2100 },
    CYCLING: { count: 3, distance: 3145, duration: 3600 }
  }
}
```

---

#### Task 3.5: 统计页面 UI
**优先级:** P0
**预估时间:** 3 小时
**文件:**
- 修改: `app/src/screens/StatsScreen.tsx`
- 新建: `app/src/components/StatCard.tsx`
- 新建: `app/src/components/StatsChart.tsx`

**显示内容:**
1. 总览卡片
   - 总里程
   - 总时长
   - 总次数
   - 总爬升

2. 分类统计
   - 徒步统计
   - 跑步统计
   - 骑行统计

3. 简单图表（可选）
   - 里程趋势图（最近 7 天/30 天）

---

#### Task 3.6: 个人中心页面
**优先级:** P1
**预估时间:** 2 小时
**文件:**
- 修改: `app/src/screens/ProfileScreen.tsx`

**功能:**
1. 用户信息展示
   - 头像
   - 昵称
   - 手机号

2. 设置选项
   - 修改昵称
   - 退出登录

---

## 📅 第四周：优化与部署

### Day 13-14: 功能完善

#### Task 4.1: 离线数据存储
**优先级:** P1
**预估时间:** 3 小时
**文件:**
- 新建: `app/src/services/OfflineStorage.ts`

**功能:**
1. 本地存储活动数据（AsyncStorage 或 SQLite）
2. 网络恢复后自动同步
3. 离线查看历史记录

---

#### Task 4.2: 后台运行支持
**优先级:** P1
**预估时间:** 2 小时
**文件:**
- 新建: `app/android/app/src/main/java/com/trektrace/TrackingService.java`
- 修改: `app/android/app/src/main/AndroidManifest.xml`

**功能:**
1. Android 前台服务（Foreground Service）
2. 通知栏显示运动状态
3. App 切换到后台时继续定位

---

#### Task 4.3: 错误处理与提示
**优先级:** P0
**预估时间:** 2 小时
**文件:**
- 新建: `app/src/utils/errorHandler.ts`
- 新建: `app/src/components/Toast.tsx`

**场景:**
1. 网络错误提示
2. GPS 未开启提示
3. 权限拒绝提示
4. 登录失效处理

---

#### Task 4.4: UI 优化
**优先级:** P1
**预估时间:** 3 小时

**优化点:**
1. 动画效果
2. 加载状态
3. 空状态页面
4. 深色模式适配

---

### Day 15-16: 后端完善

#### Task 4.5: 后端数据校验
**优先级:** P0
**预估时间:** 2 小时
**文件:**
- 修改: `backend/src/main/java/com/trektrace/dto/*`
- 新建: `backend/src/main/java/com/trektrace/exception/GlobalExceptionHandler.java`

**校验:**
1. 手机号格式校验
2. 验证码格式校验
3. 活动数据合法性校验
4. 轨迹点数据范围校验

---

#### Task 4.6: 后端性能优化
**优先级:** P1
**预估时间:** 2 小时

**优化:**
1. 数据库索引优化
   ```sql
   CREATE INDEX idx_activities_user_id ON activities(user_id);
   CREATE INDEX idx_activities_start_time ON activities(start_time);
   CREATE INDEX idx_track_points_activity_id ON track_points(activity_id);
   ```

2. 分页查询优化
3. 轨迹点批量插入优化

---

#### Task 4.7: 短信服务集成
**优先级:** P1
**预估时间:** 3 小时
**文件:**
- 修改: `backend/src/main/java/com/trektrace/service/SmsService.java`

**步骤:**
1. 注册阿里云短信服务
2. 申请短信签名和模板
3. 集成阿里云 SDK
4. 测试短信发送

---

### Day 17-18: 部署与测试

#### Task 4.8: Docker 配置
**优先级:** P0
**预估时间:** 2 小时
**文件:**
- 新建: `backend/Dockerfile`
- 新建: `docker-compose.yml`
- 新建: `nginx.conf`

**配置:**
```dockerfile
# backend/Dockerfile
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY target/trektrace-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: trektrace
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/trektrace
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - mysql

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend

volumes:
  mysql_data:
```

---

#### Task 4.9: 功能测试清单
**优先级:** P0
**预估时间:** 4 小时

**测试清单:**

**用户系统:**
- [ ] 手机号格式校验
- [ ] 验证码发送（开发环境查看控制台）
- [ ] 验证码过期校验
- [ ] 登录成功跳转
- [ ] Token 持久化
- [ ] 退出登录

**运动记录:**
- [ ] 权限申请
- [ ] GPS 定位正常
- [ ] 开始运动 → 地图显示
- [ ] 移动 → 轨迹绘制
- [ ] 数据实时更新
- [ ] 暂停/继续 → 数据保持
- [ ] 结束运动 → 数据上传
- [ ] 后台运行 → 继续记录

**历史记录:**
- [ ] 列表加载
- [ ] 下拉刷新
- [ ] 上拉加载更多
- [ ] 筛选功能
- [ ] 详情页面显示
- [ ] 轨迹回放
- [ ] GPX 导出

**数据统计:**
- [ ] 总览数据正确
- [ ] 分类统计正确
- [ ] 图表显示正常

**异常处理:**
- [ ] 无网络提示
- [ ] GPS 未开启提示
- [ ] 权限拒绝处理
- [ ] Token 过期处理

---

#### Task 4.10: 性能测试
**优先级:** P1
**预估时间:** 2 小时

**测试项:**
1. 长时间运动记录（2 小时+）
2. 大量轨迹点（1000+）
3. 内存占用
4. 电量消耗
5. 启动速度

---

#### Task 4.11: 文档完善
**优先级:** P1
**预估时间:** 2 小时
**文件:**
- 修改: `README.md`
- 新建: `docs/deployment-guide.md`
- 新建: `docs/api-documentation.md`

**文档内容:**
1. 部署指南
2. API 文档
3. 环境变量说明
4. 常见问题

---

## 📊 进度跟踪

### 每日检查点

**Day 1:**
- [ ] 前端依赖安装完成
- [ ] API 服务封装完成

**Day 2:**
- [ ] 登录页面 UI 完成
- [ ] 登录功能测试通过

**Day 3:**
- [ ] 导航框架搭建完成
- [ ] 占位页面创建完成

**Day 4:**
- [ ] 权限申请模块完成
- [ ] GPS 定位服务测试通过

**Day 5:**
- [ ] 地图组件完成
- [ ] 运动数据面板完成

**Day 6:**
- [ ] 运动控制按钮完成
- [ ] 运动类型选择完成

**Day 7:**
- [ ] 数据上传服务完成
- [ ] 完整运动记录流程测试

**Day 8:**
- [ ] 历史记录列表完成
- [ ] 下拉刷新/上拉加载完成

**Day 9:**
- [ ] 活动详情页面完成
- [ ] GPX 导出功能完成

**Day 10:**
- [ ] 统计页面完成
- [ ] 个人中心页面完成

**Day 11-12:**
- [ ] 离线存储完成
- [ ] 后台运行完成
- [ ] 错误处理完成

**Day 13-14:**
- [ ] 后端数据校验完成
- [ ] 性能优化完成
- [ ] 短信服务集成（可选）

**Day 15-16:**
- [ ] Docker 配置完成
- [ ] 部署测试通过

**Day 17-18:**
- [ ] 功能测试全部通过
- [ ] 文档完善

---

## 🎯 里程碑

### 里程碑 1: 用户系统完成（Day 1-4）
- 用户可以登录
- 导航框架搭建完成
- 可以看到所有页面（即使是占位符）

### 里程碑 2: 运动记录核心完成（Day 5-7）
- 可以开始运动
- 地图显示轨迹
- 实时数据更新
- 可以暂停/结束
- 数据成功上传

### 里程碑 3: 数据统计完成（Day 8-10）
- 可以查看历史记录
- 可以查看活动详情
- 可以查看统计数据
- 可以导出 GPX

### 里程碑 4: MVP 完成（Day 11-18）
- 所有 P0 功能完成
- 测试通过
- 可以部署上线

---

## 📝 开发注意事项

### 代码规范
1. 遵循 `docs/style-guide-zh.md` 中的设计规范
2. 使用 TypeScript 严格模式
3. 所有 API 调用都要有错误处理
4. 所有异步操作都要有 loading 状态

### Git 提交规范
- `feat:` 新功能
- `fix:` 修复 bug
- `refactor:` 重构
- `style:` 代码格式调整
- `docs:` 文档更新
- `test:` 测试相关
- `chore:` 构建/工具相关

### 测试要点
1. 每个功能开发完成后立即测试
2. 真机测试（不要只依赖模拟器）
3. 室外实地测试 GPS 功能
4. 测试各种异常情况

### 性能关注点
1. 避免频繁的 setState
2. 使用 FlatList 而非 ScrollView + map
3. 图片压缩和缓存
4. 避免内存泄漏（清理定时器、监听器）

---

## 🚨 风险与应对

### 技术风险

**风险 1: GPS 精度问题**
- 应对: 室外实地测试，使用高精度模式
- 备选: 提示用户在开阔地带使用

**风险 2: 后台定位限制**
- 应对: 使用前台服务，申请后台定位权限
- 备选: 提示用户保持 App 在前台

**风险 3: 高德地图 API 限制**
- 应对: 申请正式 Key，关注配额
- 备选: 准备多个 Key 轮换

### 时间风险

**风险 4: 业余时间不足**
- 应对: 优先完成 P0 功能
- 策略: 可以延后 P1/P2 功能

**风险 5: 遇到技术难题**
- 应对: 及时记录问题，寻求帮助
- 策略: 可以暂时绕过，先完成主线功能

---

## 📚 参考资料

### 官方文档
- [React Native](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Spring Boot](https://spring.io/projects/spring-boot)
- [高德地图 SDK](https://lbs.amap.com/)

### 设计参考
- `docs/style-guide-zh.md` - 玻璃拟态设计规范
- `resources/ui-components-g2-mobile.html` - UI 组件演示

---

## 🎉 完成标准

### MVP 完成标准
- [ ] 用户可以登录
- [ ] 可以记录运动（徒步/跑步/骑行）
- [ ] 地图显示轨迹
- [ ] 实时数据更新
- [ ] 可以查看历史记录
- [ ] 可以查看统计数据
- [ ] 可以导出 GPX
- [ ] 数据成功上传到云端
- [ ] 核心功能测试通过
- [ ] 可以部署到服务器

---

**祝开发顺利！** 🚀
