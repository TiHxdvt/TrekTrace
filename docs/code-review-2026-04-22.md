# 全量代码审查报告

**日期**: 2026-04-22
**审查范围**: 41 个已修改文件 + 29 个新增文件，覆盖前后端全部改动
**分支**: main

---

## CRITICAL（必须立即修复）

### 安全类

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| ~~C1~~ | ~~SMTP 凭据硬编码在 `application.yml` 中~~ — 移除默认值，仅保留环境变量 | `backend/src/main/resources/application.yml:92` | ✅ 已修复 |
| ~~C2~~ | ~~JWT Secret 硬编码为默认值~~ — 移除默认值 | `backend/src/main/resources/application.yml:105` | ✅ 已修复 |
| ~~C3~~ | ~~生产 API 使用 HTTP~~ — 改为 HTTPS | `app/src/config.ts:14` | ✅ 已修复 |
| ~~C4~~ | ~~生产 WebSocket 使用 HTTP~~ — 改为 WSS | `app/src/config.ts:19` | ✅ 已修复 |
| ~~C5~~ | ~~高德地图 API Key 硬编码~~ — 改为环境变量读取 | `app/src/config.ts:22` | ✅ 已修复 |
| ~~C6~~ | ~~`/api/avatars/**` 和 `/api/chat/media/**` 无需认证~~ — 移除 permitAll | `backend/.../config/SecurityConfig.java:43-44` | ✅ 已修复 |
| ~~C7~~ | ~~和风天气 API 使用开发端点~~ — 改用 api.qweather.com | `app/src/services/weatherService.ts:36` | ✅ 已修复 |

### 功能严重缺陷

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| ~~C8~~ | ~~`blacklistAllUserTokens()` 是空方法~~ — 实现了通过 DB 批量失效用户 token | `backend/.../service/TokenBlacklistService.java:44-50` | ✅ 已修复 |
| ~~C9~~ | ~~音频播放完全损坏~~ — 使用 fetch+decodeAudioData 加载音频 buffer | `app/src/services/audioService.ts:59-98` | ✅ 已修复 |
| ~~C10~~ | ~~退出群聊功能是假的~~ — 调用 removeMember(self) 实际退出 | `app/src/screens/GroupInfoScreen.tsx:106-126` | ✅ 已修复 |

---

## HIGH（应尽快修复）

### 后端

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| ~~H1~~ | ~~内存限流易受 OOM 攻击~~ — 添加了 loginAttemptMap 定期清理 | `backend/.../controller/AuthController.java:36-42` | ✅ 已修复 |
| ~~H2~~ | ~~上传大小限制不一致~~ — 对齐为 5MB | `backend/.../controller/ChatController.java:42` | ✅ 已修复 |
| ~~H3~~ | ~~搜索查询无输入验证~~ — 添加 keyword 长度限制 (1-100) | `backend/.../controller/ChatController.java:187-196` | ✅ 已修复 |
| ~~H4~~ | ~~`deleteConversation` 用 `Integer.MAX_VALUE`~~ — 改用 500 条分批加载 | `backend/.../service/ChatService.java:318` | ✅ 已修复 |
| ~~H5~~ | ~~`getMembers` 缺少权限检查~~ — 添加参与者校验 | `backend/.../service/ChatService.java:528` | ✅ 已修复 |
| ~~H6~~ | ~~`StatsService` 全量加载~~ — 改用 DB 聚合 + Top-1 查询获取 PR | `backend/.../service/StatsService.java:48` | ✅ 已修复 |
| ~~H7~~ | ~~连续性计算 O(n²)~~ — 改用 `HashSet` 做 O(1) 查找 | `backend/.../service/StatsService.java:177-184` | ✅ 已修复 |
| ~~H8~~ | ~~`ResetPasswordRequest` 无 `@NotBlank`~~ — 三个字段均已添加 | `backend/.../dto/ResetPasswordRequest.java:10-18` | ✅ 已修复 |
| ~~H9~~ | ~~`EmailService` 强制注入~~ — 改用 `ObjectProvider<JavaMailSender>` | `backend/.../service/EmailService.java:24-28` | ✅ 已修复 |
| ~~H10~~ | ~~`deleteByExpiresAtBefore` 缺 `@Transactional`~~ — 添加 `@Modifying @Transactional` | `backend/.../repository/TokenBlacklistRepository.java:14` | ✅ 已修复 |

### 前端

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| ~~H11~~ | ~~`fmtH` 函数除以 360~~ — 改为 3600 | `app/src/screens/StatsScreen.tsx:271` | ✅ 已修复 |
| ~~H12~~ | ~~`estimateCalories` 爬升奖励逻辑错误~~ — 修正计算公式 | `app/src/utils/statsComputations.ts:110-112` | ✅ 已修复 |
| ~~H13~~ | ~~乐观消息去重逻辑脆弱~~ — 添加 5 秒时间窗口 | `app/src/screens/ChatScreen.tsx:256-264` | ✅ 已修复 |
| ~~H14~~ | ~~Token 刷新失败不清除 UI~~ — 通过 DeviceEventEmitter 发送 AUTH_EXPIRED 事件 | `app/src/services/api.ts:148-156` | ✅ 已修复 |
| ~~H15~~ | ~~`removeToken` 只清 Keychain~~ — 同时清除 AsyncStorage 回退 | `app/src/services/storageService.ts:69-75` | ✅ 已修复 |

---

## MEDIUM（应计划修复）

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| ~~M1~~ | ~~聊天搜索无防抖~~ — ChatScreen 和 MessagesScreen 均添加 300ms 防抖 | `ChatScreen.tsx:759`, `MessagesScreen.tsx:517` | ✅ 已修复 |
| M2 | 数据库操作全同步阻塞 JS 线程 (`db.executeSync`) | `chatDatabaseService.ts` 全文 | 需重构 |
| M3 | `deleteConversation` 物理删除所有参与者数据，而非"为我删除"语义 | `ChatService.java:312-328` | 设计决策 |
| ~~M4~~ | ~~会话排序只按置顶排~~ — 添加 updatedAt 倒序排序 | `ChatService.java:249-254` | ✅ 已修复 |
| ~~M5~~ | ~~好友动态分页计数错误~~ — 使用 `activities.getTotalElements()` 替代 `dtos.size()` | `ActivityService.java:482` | ✅ 已修复 |
| ~~M6~~ | ~~验证码兑换存在 TOCTOU 竞态条件~~ — 改用原子 `consumeCode` UPDATE 查询 | `AuthController.java:114-120` | ✅ 已修复 |
| ~~M7~~ | ~~`AuthController` 字段注入~~ — 改为构造函数注入 | `AuthController.java:44-63` | ✅ 已修复 |
| ~~M8~~ | ~~`JwtUtil` 重复解析 token~~ — 提取公共 `parseClaims` 方法 | `JwtUtil.java` 全文 | ✅ 已修复 |
| ~~M9~~ | ~~CORS `allowedHeaders("*")`~~ — 限定为 `Authorization/Content-Type/X-Requested-With` | `SecurityConfig.java:68` | ✅ 已修复 |
| ~~M10~~ | ~~`UpdateProfileRequest` 缺少验证~~ — 添加 `@Size`/`@Pattern` 注解 | `UpdateProfileRequest.java` | ✅ 已修复 |
| ~~M11~~ | ~~`StatsSummaryResponse` 混用 BigDecimal/double~~ — 统一使用 BigDecimal | `StatsSummaryResponse.java` | ✅ 已修复 |
| ~~M12~~ | ~~`TrackDataValidator` null 坐标 NPE~~ — 添加 null 检查 | `TrackDataValidator.java:85` | ✅ 已修复 |
| ~~M13~~ | ~~SQL 迁移 V2 中 `ALTER TABLE` 无 `IF NOT EXISTS`~~ — 改用 INFORMATION_SCHEMA 列存在性检查 | `V2__auth_enhancements.sql:25-54` | ✅ 已修复 |
| ~~M14~~ | ~~ProfileScreen 身高体重无范围校验~~ — 添加 20-300kg/50-300cm 校验 | `ProfileScreen.tsx:239-246` | ✅ 已修复 |
| M15 | `useMemo(() => StyleSheet.create(...))` 旧样式表不清理 | 约 15 个文件 | 低优先级 |
| ~~M16~~ | ~~`handleTogglePin` 三元逻辑错误~~ — 简化为 find+if | `MessagesScreen.tsx:281-285` | ✅ 已修复 |
| ~~M17~~ | ~~`DataManagementController` format 参数未使用~~ — 添加格式校验 | `DataManagementController.java:32` | ✅ 已修复 |
| ~~M18~~ | ~~`LoginResponse.UserDTO` 未遮蔽手机号~~ — 添加 maskPhone | `LoginResponse.java:29` | ✅ 已修复 |

---

## LOW（建议改进）

### 未使用导入/变量 ✅ 已修复

- ~~`ElevationChart.tsx` — `SvgText` 导入未使用，`distKm` 变量未使用~~ → 已移除
- ~~`useRecordingState.ts` — `Linking` 和 `Alert` 导入未使用~~ → 已移除
- ~~`SummaryOverlay.tsx` — `ScrollView` 导入未使用~~ → 已移除
- ~~`MapOverlayButtons.tsx` — `PANEL_HEIGHT` 常量未使用~~ → 已移除

### 类型安全

- 多个 activity 组件使用 `colors: any` prop 类型（`MapOverlayButtons.tsx`、`LapStatsView.tsx`、`dynamicStyles.ts` 等）
- `ChatOverlay.tsx` 用 `as any` 转换绕过 navigation/route 类型检查

### 重复代码

- ~~`maskPhone` 工具方法在 `FriendshipService`、`ProfileResponse` 等多处重复~~ → 已提取为 `PhoneUtils.maskPhone()` 工具类 ✅ 已修复
- `PersonalRecordsCard` 中 `fmtPace`/`fmtDistance`/`fmtDuration` 与 `utils/format.ts` 重复

### 测试覆盖不足

- `StatsService` 的 `getWeekSummary`/`getMonthSummary`/`getYearSummary` 无测试
- `ChatService`、`FriendshipService`、`NotificationService` 等关键服务缺少充分测试
- `AuthController` 验证码/密码重置/刷新 token 逻辑无测试

### 其他

| 问题 | 位置 | 状态 |
|------|------|------|
| ~~`Clipboard` 从 `react-native` 导入已弃用~~ — 改用 `@react-native-clipboard/clipboard` | `ChatMessageItem.tsx:19` | ✅ 已修复 |
| `LoginScreen` 有 25+ 个 `useState` | `LoginScreen.tsx:39-75` | |
| ~~`gpxExport.ts` XML 未转义特殊字符~~ — 添加 `escapeXml` 函数，GPX 和 KML 均已转义 | `gpxExport.ts:9-16,28,38-39` | ✅ 已修复 |
| ~~`TrackDataValidator` MAX_SPEED_MS 过高~~ — 调整为 83 m/s (~300 km/h) | `TrackDataValidator.java:17` | ✅ 已修复 |
| `FriendsScreen` 用 ScrollView.map() 而非 FlatList | `FriendsScreen.tsx:575-609` | |
| ~~`ElevationChart` Math.max 栈溢出风险~~ — 改用 `reduce` 逐项比较 | `ElevationChart.tsx:38-39` | ✅ 已修复 |
| ~~SQL V2 冗余索引~~ → 已移除 UNIQUE 列上的重复索引 | `V2__auth_enhancements.sql:8-9` | ✅ 已修复 |
| ~~SQL V5 `expires_at` 缺少索引~~ — 添加 `idx_friendship_expires` 索引 | `V5__friendship_expiration.sql:3` | ✅ 已修复 |
| SQL V6 经纬度精度过高 | `V6__user_last_location.sql:1-2` | |
| ~~`EmailVerificationToken` 无 `@ManyToOne` 映射~~ — 改为 `@ManyToOne User user` | `EmailVerificationToken.java:20-22` | ✅ 已修复 |

---

## 统计

| 严重程度 | 总数 | 已修复 |
|----------|------|--------|
| CRITICAL | 10 | 10 |
| HIGH | 15 | 15 |
| MEDIUM | 18 | 15 |
| LOW | ~20 | 12 |
| **合计** | **~63** | **~52** |

### 未修复项（需要架构决策或大范围重构）

| 编号 | 原因 |
|------|------|
| M2 | `chatDatabaseService` 同步 DB 操作 — 需要迁移到异步架构，影响面大 |
| M3 | `deleteConversation` 删除语义 — 需要产品决策"为我删除"还是"所有人删除" |
| M15 | `useMemo(() => StyleSheet.create(...))` — 低优先级，约 15 个文件需改动 |
| LoginScreen useState 过多 | 需要用 useReducer 重构，属于重构任务 |
| FriendsScreen ScrollView | 需要改为 FlatList，属于性能优化 |
| SQL V6 经纬度精度 | 需要确认数据库是否已部署再决定是否修改 |
| 类型安全 (`colors: any`, `ChatOverlay as any`) | 需要定义完整类型，改动面广 |
| PersonalRecordsCard 重复格式函数 | 需要确认 utils/format.ts API 是否兼容 |
| 测试覆盖不足 | 长期任务 |

---

## 修复完成摘要

本轮审查共发现约 63 个问题，已修复 52 个：

- **CRITICAL 10/10** — 全部修复（硬编码凭据、HTTPS、认证绕过、功能缺陷）
- **HIGH 15/15** — 全部修复（OOM 防护、权限检查、计算错误、UI 状态同步）
- **MEDIUM 15/18** — 3 项保留（M2 需架构重构、M3 需产品决策、M15 低优先级）
- **LOW 12/20** — 8 项保留（类型安全、测试覆盖、性能优化等长期任务）
