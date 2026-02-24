## 后端开发文档

### 系统架构与技术选型
- **平台**：`uniCloud` 云开发（云对象 + 云函数）
- **数据库**：`MongoDB` 文档数据库（schema 约束）
- **认证**：`uni-id-common` Token 鉴权
- **核心特性**：云对象接口统一管理、JQL 查询、事务处理

### 项目模块划分说明
- [community-service/index.obj.js](f:\CommunityApp\Community\uniCloud-alipay\cloudfunctions\community-service\index.obj.js)：社区搜索、用户社区管理
- [task-service/index.obj.js](f:\CommunityApp\Community\uniCloud-alipay\cloudfunctions\task-service\index.obj.js)：任务发布、草稿、接单
- [task-query/index.obj.js](f:\CommunityApp\Community\uniCloud-alipay\cloudfunctions\task-query\index.obj.js)：任务列表与搜索
- [user-center/index.obj.js](f:\CommunityApp\Community\uniCloud-alipay\cloudfunctions\user-center\index.obj.js)：用户资料、实名、余额
- [finance-service/index.obj.js](f:\CommunityApp\Community\uniCloud-alipay\cloudfunctions\finance-service\index.obj.js)：提现与资金流水

### API 接口详细文档（请求/响应示例）
#### 1) 社区模块 `community-service`
- **searchCommunities**：社区搜索
```json
// request
{ "keyword": "学府", "page": 1, "pageSize": 20 }
// response
{ "data": [{"_id": "...", "name": "学府花园"}], "total": 1 }
```
- **getUserCommunities**：获取用户社区
```json
// request
{}
// response
[{"_id": "...", "name": "学府花园"}]
```
- **addCommunity**：新增用户社区
```json
// request
{ "community_id": "..." }
// response
{ "success": true }
```
- **setUserCommunities**：批量设置社区（替换全部）
```json
// request
{ "community_ids": ["...", "..."] }
// response
{ "success": true }
```
- **removeCommunity**：删除用户社区
```json
// request
{ "community_id": "..." }
// response
{ "success": true }
```

#### 2) 任务模块 `task-service`
- **getTaskConfig**：任务发布配置
```json
// response
{ "service_fee_rate": 0.1, "min_reward": 5, "max_reward": 1000 }
```
- **createTask**：发布任务
```json
// request
{
  "title": "取快递",
  "task_type": "取快递",
  "description": "到菜鸟驿站取件",
  "community_id": "...",
  "community_name": "学府花园",
  "reward": 10
}
// response
{ "success": true, "task_id": "...", "order_no": "T...", "total_amount": 11 }
```
- **saveDraft**：保存草稿
```json
// request
{ "title": "取快递", "community_id": "..." }
// response
{ "success": true, "draft_id": "..." }
```
- **getDraft**：获取最新草稿
```json
// request
{}
// response
{ "_id": "...", "title": "取快递", "is_draft": true }
```
- **deleteDraft**：删除草稿
```json
// request
{ "draft_id": "..." }
// response
{ "success": true }
```
- **acceptTask**：接单任务
```json
// request
{ "task_id": "..." }
// response
{ "success": true }
```

#### 3) 任务查询 `task-query`
- **getTaskList**：任务大厅列表
```json
// request
{ "community_ids": ["..."], "page": 1, "pageSize": 20 }
// response
{ "data": [{"_id": "...", "title": "取快递"}], "total": 1 }
```
- **searchTasks**：任务搜索
```json
// request
{ "keyword": "快递", "page": 1, "pageSize": 20 }
// response
{ "data": [{"_id": "...", "title": "取快递"}], "total": 1 }
```
- **getTaskDetail**：任务详情
```json
// request
{ "task_id": "..." }
// response
{ "_id": "...", "title": "取快递", "publisher": {"_id": "..."} }
```
- **getMyTasks**：我发布/我接单的任务
```json
// request
{ "type": "published", "status": "pending", "page": 1, "pageSize": 20 }
// response
{ "data": [{"_id": "...", "status": "pending"}], "total": 1 }
```

#### 4) 用户模块 `user-center`
- **getUserInfo**：用户信息与余额
- **completeProfile**：完善资料
- **updateAvatar**：更新头像
- **getMyTasks**：获取我的任务
- **getBalanceInfo**：余额与流水摘要
- **getTransactions**：流水明细
- **getVerifyStatus**：实名状态
- **submitVerification**：提交实名
- **updateNickname**：修改昵称

#### 5) 财务模块 `finance-service`
- **submitWithdraw**：提交提现申请
```json
// request
{ "amount": 20, "method": "wechat" }
// response
{ "success": true, "message": "提现申请已提交" }
```
- **getWithdrawals**：提现记录
```json
// request
{ "status": "pending", "page": 1, "pageSize": 20 }
// response
{ "data": [{"_id": "...", "amount": 20}], "count": 1 }
```

### 数据库设计说明
- **tasks**：任务主表（`reward`、`status`、`publisher_id`、`receiver_id`、`is_draft`）。
- **task_orders**：任务订单表（`order_no`、`amount`、`reward`、`service_fee`）。
- **user-profile**：用户扩展信息（`credit_score`、`balance`、`task_published_count`）。
- **transactions**：资金流水（`type`、`amount`、`status`）。
- **withdrawals**：提现记录（`amount`、`method`、`status`）。
- **communities**：社区信息（`name`、`task_count`）。
- **user_communities**：用户与社区关系表。
- **system_config**：系统配置（任务类型、服务费率等）。
- **uni-id-users**：基础用户表。

**示例：tasks 字段**（摘自 [tasks.schema.json](f:\CommunityApp\Community\uniCloud-alipay\database\tasks.schema.json)）
```json
{
  "title": "Task title",
  "reward": 10,
  "status": "pending",
  "publisher_id": "uni-id-users._id"
}
```

### 环境配置和部署指南
- **云环境配置**：在 `uniCloud-alipay` 目录绑定云服务空间。
- **数据库初始化**：参考 `db_init.json` 初始化基础数据与配置。
- **部署流程**：在 HBuilderX `uniCloud` 面板上传云对象与 schema。

### 关键业务逻辑说明
- **任务发布**：创建任务 → 创建订单 → 更新发布统计 → 增加社区任务数。
- **任务接单**：通过 `where` 过滤 `status: pending` 原子更新，避免抢单冲突。
- **任务查询**：根据社区、类型、奖励区间进行组合过滤。
- **用户资料**：首次读取时自动创建 `user-profile`。
- **提现处理**：使用事务扣减余额、写入提现记录与流水。

### 代码示例与最佳实践
- **鉴权**：在 `_before` 中统一校验 `uniIdToken`。
- **事务操作**：资金操作必须使用 `db.startTransaction()`。
- **参数校验**：入口校验必填字段与范围（如 reward、credit_score）。
- **避免并发问题**：更新任务状态时带条件过滤。

### 常见问题解决方案
- **Unauthorized 错误**：确认前端传递 `uni_id_token` 并已登录。
- **任务被抢**：`acceptTask` 通过原子更新确保并发安全。
- **提现失败**：确认用户实名认证且余额足够。
- **查询为空**：检查 `community_ids` 是否为空或过滤条件过严。

### 新开发者快速上手建议
- **入口了解**：从 `task-service`、`task-query` 阅读主流程。
- **理解数据模型**：优先阅读 `tasks`、`task_orders`、`user-profile` 相关 schema。
- **掌握鉴权**：熟悉 `_before` 统一鉴权与 `uni-id-common` 的使用方式。
