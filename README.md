# 途迹 TrekTrace

户外运动记录 App，支持徒步、跑步、骑行的轨迹记录与数据统计。

## 项目结构

```
trektrace/
├── app/           # React Native 前端
├── backend/       # Spring Boot 后端
├── docs/          # 设计文档
└── resources/     # UI 资源
```

## 技术栈

| 层 | 方案 |
|---|---|
| 前端 | React Native + TypeScript |
| 地图 | 高德地图 SDK |
| 后端 | Java + Spring Boot |
| 数据库 | MySQL |
| 部署 | 云服务器 + Docker |

## 开发

### 前端

```bash
cd app
npm install
npm run android  # 或 npm run ios
```

### 后端

```bash
cd backend
./mvnw spring-boot:run
```

## 文档

- [需求设计](docs/2026-04-06-trektrace-mvp-design.md)
- [实现计划](docs/2026-04-06-trektrace-mvp-implementation.md)

---

> 项目发起人：温昊东
