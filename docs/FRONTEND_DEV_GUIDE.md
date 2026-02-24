## 前端开发文档

### 项目概述与技术栈
- **项目定位**：社区任务平台的用户端与管理端前端，覆盖任务发布、接单、搜索、消息与账户管理。
- **技术栈**：
  - **框架**：`uni-app`（Vue 3）
  - **状态管理**：`Pinia`
  - **云能力**：`uniCloud`（云对象 + JQL）
  - **UI/组件**：`uni_modules` 生态组件 + 项目自定义组件

### 目录结构详解
- **核心入口**
  - [main.js](f:\CommunityApp\Community\main.js)：应用入口，注入 Pinia。
  - [App.vue](f:\CommunityApp\Community\App.vue)：全局样式、应用启动逻辑。
  - [pages.json](f:\CommunityApp\Community\pages.json)：路由、TabBar 与权限控制配置。
- **页面与功能**
  - `pages/`：用户端核心页面（任务大厅、发布、消息、个人中心等）。
  - `admin/`：管理端页面与业务组件。
- **组件库**
  - [components/TaskCard/TaskCard.vue](f:\CommunityApp\Community\components\TaskCard\TaskCard.vue)：任务卡片展示组件。
  - [components/PageHeader/PageHeader.vue](f:\CommunityApp\Community\components\PageHeader\PageHeader.vue)：统一导航栏组件。
  - [components/EmptyState/EmptyState.vue](f:\CommunityApp\Community\components\EmptyState\EmptyState.vue)：空状态展示组件。
- **状态管理**
  - [store/user.ts](f:\CommunityApp\Community\store\user.ts)：用户信息、社区、登录状态、信用分等。
  - [store/app.ts](f:\CommunityApp\Community\store\app.ts)：系统配置、消息计数等全局信息。
- **通用工具**
  - [utils/request.ts](f:\CommunityApp\Community\utils\request.ts)：云对象请求封装（重试/去重/超时/登录过期处理）。
  - [utils/guard.ts](f:\CommunityApp\Community\utils\guard.ts)：路由守卫与权限控制。
  - [utils/common.ts](f:\CommunityApp\Community\utils\common.ts)：日期、价格、图片处理等通用函数。

### 核心组件功能说明
- **`TaskCard`**：统一任务卡片样式，支持任务状态标签、奖励展示、社区信息展示。
- **`PageHeader`**：统一导航栏，支持返回按钮、搜索模式与渐变样式。
- **`EmptyState`**：统一空状态组件，内置任务空、搜索空、网络错误等场景。

### 接口调用方式与数据流说明
#### 云对象请求封装（推荐）
在 [utils/request.ts](f:\CommunityApp\Community\utils\request.ts) 中提供 `callCloudObject`，支持重试、去重、超时与登录失效处理。

```ts
import { callCloudObject } from '@/utils/request'

const res = await callCloudObject('task-query', 'getTaskList', {
  community_ids: ['communityId'],
  page: 1,
  pageSize: 20
}, { retry: 1, dedup: true })
```

#### JQL 查询辅助
```ts
import { paginatedQuery } from '@/utils/request'

const result = await paginatedQuery({
  collection: 'tasks',
  where: 'status == "pending"',
  orderBy: 'created_at desc',
  page: 1,
  pageSize: 20
})
```

#### 典型数据流
1. 页面触发请求 → 通过 `callCloudObject` 调用云对象方法。
2. 接口返回 → 写入 `Pinia`（如 `user`、`app`）或页面局部状态。
3. `TaskCard` 等组件基于状态渲染 UI。
4. `utils/guard.ts` 负责路由鉴权与登录跳转。

### 开发环境配置指南
- **Node.js**：建议使用 `>=16`。
- **HBuilderX**：推荐使用 HBuilderX（包含 uniCloud 面板与运行环境）。
- **云环境**：在 `uniCloud-alipay` 目录下配置云服务空间并绑定账号。
- **依赖安装**：
  - 项目根目录执行 `npm install`。

### 构建和部署流程
- **本地调试**：HBuilderX 选择运行到浏览器/小程序模拟器。
- **发布构建**：HBuilderX → 发行 → 选择目标平台（H5 / 小程序 / APP）。
- **云对象部署**：通过 `uniCloud` 面板部署云对象与数据库 schema。

### 代码示例与最佳实践
- **统一请求入口**：所有云对象调用使用 `callCloudObject` 统一处理错误与登录失效。
- **状态集中管理**：用户相关字段统一放在 `store/user.ts`，避免分散。
- **组件复用**：列表页统一使用 `TaskCard`，空状态统一使用 `EmptyState`。
- **权限控制**：进入需要登录的页面前使用 `utils/guard.ts` 进行校验。

### 常见问题解决方案
- **登录状态失效**：检测 `uni_id_token` 是否过期，`callCloudObject` 会自动跳转登录。
- **请求超时**：使用 `timeout` 选项并提示用户网络重试。
- **列表重复请求**：使用 `dedup: true` 去重并发请求。

### 新开发者快速上手建议
- **入口梳理**：先阅读 [pages.json](f:\CommunityApp\Community\pages.json) 的路由和 TabBar 配置。
- **请求封装**：理解 [utils/request.ts](f:\CommunityApp\Community\utils\request.ts) 中的 `callCloudObject` 与 `paginatedQuery`。
- **组件体系**：了解 `TaskCard` / `PageHeader` / `EmptyState` 的输入参数与使用场景。
