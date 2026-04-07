# 途迹 TrekTrace MVP - 实现计划

> **项目：** 途迹 TrekTrace MVP
> **创建时间：** 2026-04-06
> **预估周期：** 业余时间 2-3 周

**目标：** 完成户外运动记录 MVP，支持徒步/跑步/骑行的轨迹记录、数据统计、用户登录

**架构：** 前后端分离，React Native 前端 + Spring Boot 后端，高德地图 SDK

**技术栈：**
- 前端：React Native + TypeScript + 高德地图 SDK
- 后端：Java + Spring Boot + MySQL
- 部署：云服务器 + Docker

---

## 阶段一：项目初始化（2-3 小时）

### Task 1.1: 创建后端项目

**文件：**
- 创建：`trektrace-backend/` 项目目录

**步骤：**

1. 使用 Spring Initializr 创建项目
   - 访问 https://start.spring.io/
   - 选择：Maven, Java 17, Spring Boot 3.x
   - 依赖：Spring Web, Spring Data JPA, MySQL Driver, Lombok, Validation

2. 创建基础目录结构
   ```
   trektrace-backend/
   ├── src/main/java/com/trektrace/
   │   ├── controller/
   │   ├── service/
   │   ├── repository/
   │   ├── entity/
   │   ├── dto/
   │   ├── config/
   │   └── TrektraceApplication.java
   ├── src/main/resources/
   │   └── application.yml
   └── pom.xml
   ```

3. 配置数据库连接（application.yml）
   ```yaml
   spring:
     datasource:
       url: jdbc:mysql://localhost:3306/trektrace
       username: root
       password: your_password
     jpa:
       hibernate:
         ddl-auto: update
       show-sql: true
   ```

4. 提交代码
   ```bash
   git init
   git add .
   git commit -m "chore: init Spring Boot backend project"
   ```

---

### Task 1.2: 创建前端项目

**文件：**
- 创建：`trektrace-app/` 项目目录

**步骤：**

1. 创建 React Native 项目
   ```bash
   npx react-native@latest init TrekTrace --template typescript
   ```

2. 安装核心依赖
   ```bash
   cd TrekTrace
   npm install @react-navigation/native @react-navigation/stack
   npm install react-native-maps react-native-geolocation-service
   npm install axios react-native-async-storage/async-storage
   npm install react-native-chart-kit react-native-svg
   ```

3. 创建基础目录结构
   ```
   trektrace-app/
   ├── src/
   │   ├── screens/
   │   ├── components/
   │   ├── services/
   │   ├── types/
   │   ├── utils/
   │   └── navigation/
   ├── App.tsx
   └── package.json
   ```

4. 提交代码
   ```bash
   git init
   git add .
   git commit -m "chore: init React Native frontend project"
   ```

---

### Task 1.3: 高德地图 SDK 集成

**文件：**
- 修改：`trektrace-app/android/app/build.gradle`
- 修改：`trektrace-app/android/app/src/main/AndroidManifest.xml`

**步骤：**

1. 申请高德地图开发者账号
   - 访问 https://lbs.amap.com/
   - 创建应用，获取 Android SDK Key

2. 添加高德地图依赖（build.gradle）
   ```gradle
   implementation 'com.amap.api:map2d:latest.integration'
   implementation 'com.amap.api:location:latest.integration'
   ```

3. 配置 AndroidManifest.xml
   ```xml
   <meta-data
       android:name="com.amap.api.v2.apikey"
       android:value="YOUR_AMAP_KEY" />
   ```

4. 测试地图显示
   - 创建简单页面显示地图
   - 运行 `npm run android` 验证

5. 提交代码
   ```bash
   git add .
   git commit -m "feat: integrate AMap SDK"
   ```

---

## 阶段二：数据库设计（1-2 小时）

### Task 2.1: 设计数据库表结构

**文件：**
- 创建：`docs/database-schema.sql`

**表结构：**

```sql
-- 用户表
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(11) UNIQUE NOT NULL,
    nickname VARCHAR(50),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 运动记录表
CREATE TABLE activities (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    type ENUM('HIKING', 'RUNNING', 'CYCLING') NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INT, -- 秒
    distance DECIMAL(10, 2), -- 米
    elevation_gain DECIMAL(10, 2), -- 爬升米
    status ENUM('ONGOING', 'PAUSED', 'COMPLETED') DEFAULT 'ONGOING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 轨迹点表
CREATE TABLE track_points (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    activity_id BIGINT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    altitude DECIMAL(8, 2),
    timestamp TIMESTAMP NOT NULL,
    speed DECIMAL(5, 2), -- m/s
    FOREIGN KEY (activity_id) REFERENCES activities(id)
);

-- 验证码表
CREATE TABLE verification_codes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(11) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Task 2.2: 创建后端实体类

**文件：**
- 创建：`trektrace-backend/src/main/java/com/trektrace/entity/User.java`
- 创建：`trektrace-backend/src/main/java/com/trektrace/entity/Activity.java`
- 创建：`trektrace-backend/src/main/java/com/trektrace/entity/TrackPoint.java`

**示例（User.java）：**

```java
@Entity
@Table(name = "users")
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 11)
    private String phone;

    @Column(length = 50)
    private String nickname;

    private String avatarUrl;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
```

---

## 阶段三：用户体系（3-4 小时）

### Task 3.1: 验证码发送接口

**文件：**
- 创建：`entity/VerificationCode.java`
- 创建：`service/SmsService.java`
- 创建：`controller/AuthController.java`

**步骤：**

1. 创建验证码实体

2. 实现短信发送服务（先用 mock，后期对接阿里云）
   ```java
   @Service
   public class SmsService {
       public void sendVerificationCode(String phone) {
           String code = String.format("%06d", new Random().nextInt(1000000));
           // TODO: 对接阿里云短信
           System.out.println("验证码: " + code); // 开发环境打印
       }
   }
   ```

3. 创建 API 接口
   ```
   POST /api/auth/send-code
   Body: { "phone": "13800138000" }
   Response: { "success": true }
   ```

4. 测试接口
   ```bash
   curl -X POST http://localhost:8080/api/auth/send-code \
     -H "Content-Type: application/json" \
     -d '{"phone":"13800138000"}'
   ```

5. 提交代码
   ```bash
   git add .
   git commit -m "feat: add verification code API"
   ```

---

### Task 3.2: 登录接口

**文件：**
- 修改：`controller/AuthController.java`
- 创建：`service/AuthService.java`
- 创建：`util/JwtUtil.java`

**步骤：**

1. 添加 JWT 依赖
   ```xml
   <dependency>
       <groupId>io.jsonwebtoken</groupId>
       <artifactId>jjwt</artifactId>
       <version>0.9.1</version>
   </dependency>
   ```

2. 实现 JWT 工具类

3. 实现登录逻辑
   - 验证码校验
   - 创建/获取用户
   - 生成 JWT token

4. 创建 API 接口
   ```
   POST /api/auth/login
   Body: { "phone": "13800138000", "code": "123456" }
   Response: { "token": "jwt_token", "user": {...} }
   ```

5. 提交代码
   ```bash
   git add .
   git commit -m "feat: add login API with JWT"
   ```

---

### Task 3.3: 前端登录页面

**文件：**
- 创建：`trektrace-app/src/screens/LoginScreen.tsx`

**步骤：**

1. 创建登录页面 UI
   - 手机号输入框
   - 验证码输入框 + 获取验证码按钮
   - 登录按钮

2. 实现发送验证码逻辑
   - 60s 倒计时

3. 实现登录逻辑
   - 调用后端接口
   - 存储 token 到 AsyncStorage

4. 测试登录流程

5. 提交代码
   ```bash
   git add .
   git commit -m "feat: add login screen"
   ```

---

## 阶段四：运动记录核心功能（6-8 小时）

### Task 4.1: 后端活动记录接口

**文件：**
- 创建：`controller/ActivityController.java`
- 创建：`service/ActivityService.java`
- 创建：`dto/CreateActivityDTO.java`
- 创建：`dto/TrackPointDTO.java`

**API 设计：**

```
POST /api/activities          # 创建活动
PUT  /api/activities/:id      # 更新活动（暂停/结束）
POST /api/activities/:id/points  # 上传轨迹点
GET  /api/activities/:id      # 获取活动详情
GET  /api/activities          # 获取活动列表
```

---

### Task 4.2: GPS 定位服务（前端）

**文件：**
- 创建：`trektrace-app/src/services/LocationService.ts`

**步骤：**

1. 申请定位权限（Android）

2. 封装定位服务
   ```typescript
   export class LocationService {
     // 开始持续定位
     startTracking(callback: (point: TrackPoint) => void): void

     // 停止定位
     stopTracking(): void

     // 获取当前位置
     getCurrentPosition(): Promise<TrackPoint>
   }
   ```

3. 测试定位功能

4. 提交代码
   ```bash
   git add .
   git commit -m "feat: add location service"
   ```

---

### Task 4.3: 运动记录页面

**文件：**
- 创建：`trektrace-app/src/screens/ActivityScreen.tsx`
- 创建：`trektrace-app/src/components/MapView.tsx`

**页面元素：**
- 地图显示当前轨迹
- 实时数据：距离、时长、配速、海拔
- 开始/暂停/结束按钮
- 运动模式选择（徒步/跑步/骑行）

**步骤：**

1. 实现地图组件
   - 显示当前位置
   - 绘制轨迹线

2. 实现数据计算
   - 距离累计
   - 时长计时
   - 配速计算
   - 海拔爬升计算

3. 实现控制逻辑
   - 开始 → 开启定位、计时
   - 暂停 → 停止定位、计时
   - 结束 → 停止定位、上传数据

4. 测试完整流程

5. 提交代码
   ```bash
   git add .
   git commit -m "feat: add activity tracking screen"
   ```

---

### Task 4.4: 轨迹数据上传

**文件：**
- 修改：`trektrace-app/src/services/ActivityService.ts`

**策略：**
- 活动进行中：每 10 秒上传一次轨迹点（批量）
- 活动结束：上传完整活动信息

---

## 阶段五：数据统计功能（4-5 小时）

### Task 5.1: 统计数据后端接口

**文件：**
- 创建：`controller/StatsController.java`
- 创建：`service/StatsService.java`

**API 设计：**

```
GET /api/stats/summary  # 获取总览数据
Response: {
  "totalDistance": 123.45,
  "totalDuration": 36000,
  "totalActivities": 15,
  "totalElevationGain": 1500.5
}

GET /api/activities?page=1&size=20&type=HIKING  # 获取活动列表
```

---

### Task 5.2: 历史记录列表页面

**文件：**
- 创建：`trektrace-app/src/screens/HistoryScreen.tsx`
- 创建：`trektrace-app/src/components/ActivityCard.tsx`

**页面元素：**
- 活动列表（支持下拉刷新、上拉加载）
- 筛选器（按运动模式）
- 每条记录显示：日期、模式、距离、时长

---

### Task 5.3: 活动详情页面

**文件：**
- 创建：`trektrace-app/src/screens/ActivityDetailScreen.tsx`

**页面元素：**
- 地图轨迹回放
- 海拔曲线图（可使用 react-native-chart-kit）
- 详细数据：距离、时长、配速分布、爬升
- GPX 导出按钮

---

### Task 5.4: 总览统计页面

**文件：**
- 创建：`trektrace-app/src/screens/StatsScreen.tsx`

**页面元素：**
- 总里程
- 总时长
- 总次数
- 总爬升
- 简单图表展示

---

## 阶段六：集成与部署（2-3 小时）

### Task 6.1: 导航集成

**文件：**
- 修改：`trektrace-app/src/navigation/AppNavigator.tsx`

**Tab 导航：**
- 记录（ActivityScreen）
- 历史（HistoryScreen）
- 统计（StatsScreen）
- 我的（ProfileScreen）

---

### Task 6.2: Docker 部署配置

**文件：**
- 创建：`trektrace-backend/Dockerfile`
- 创建：`docker-compose.yml`

```dockerfile
# Dockerfile
FROM openjdk:17-jdk-slim
COPY target/trektrace-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: your_password
      MYSQL_DATABASE: trektrace
    volumes:
      - mysql_data:/var/lib/mysql

  backend:
    build: ./trektrace-backend
    ports:
      - "8080:8080"
    depends_on:
      - mysql

volumes:
  mysql_data:
```

---

### Task 6.3: 测试清单

**功能测试：**
- [ ] 登录流程（获取验证码 + 登录）
- [ ] 开始运动 → 轨迹显示
- [ ] 暂停/继续 → 数据保持
- [ ] 结束运动 → 数据上传
- [ ] 历史记录列表加载
- [ ] 活动详情查看
- [ ] 统计数据显示

**异常测试：**
- [ ] 无网络时的提示
- [ ] GPS 未开启时的提示
- [ ] App 后台切换时的数据保持

---

## 开发顺序建议

1. **第一周：** 阶段一 + 阶段二（项目初始化 + 数据库）
2. **第二周：** 阶段三 + 阶段四前半（用户体系 + 运动记录后端）
3. **第三周：** 阶段四后半 + 阶段五 + 阶段六（运动记录前端 + 统计 + 部署）

---

## 备注

- 每个任务完成后及时提交代码
- 遇到问题随时调整计划
- 可以先跑通核心流程，再优化细节
