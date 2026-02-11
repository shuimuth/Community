# Vue 开发技能

这是一个综合性的 Vue.js 开发技能，帮助你使用 Vue 3、Composition API 和现代工具链构建高质量的 Web 应用。

## 适用场景

当你需要以下任何功能时，请使用此技能：

- **初始化 Vue 项目** - 使用 Vite 快速搭建现代化的 Vue 3 项目
- **组件开发** - 创建单文件组件（SFC），使用 Composition API 和响应式系统
- **状态管理** - 使用 Pinia 管理应用状态
- **路由配置** - 使用 Vue Router 实现单页应用导航
- **TypeScript 集成** - 为 Vue 项目添加类型安全
- **组合式函数** - 编写可复用的逻辑代码
- **性能优化** - 实现懒加载、虚拟滚动、缓存等优化
- **测试** - 使用 Vitest 和 Playwright 进行单元测试和 E2E 测试
- **UI 组件库集成** - 集成 Element Plus、Ant Design Vue 等

## 主要功能

### 1. 项目初始化
```bash
npm create vue@latest my-app
```
- 使用官方脚手架快速创建项目
- 自动配置 TypeScript、Router、Pinia 等
- 集成 Vite 构建工具

### 2. 组件开发
- 使用 `<script setup>` 语法编写简洁的组件代码
- 响应式系统：`ref`、`reactive`、`computed`
- 生命周期钩子：`onMounted`、`onUnmounted` 等
- 组件通信：props、emits、provide/inject

### 3. 状态管理
- 使用 Pinia 定义和管理全局状态
- 支持模块化、TypeScript 类型推断
- 轻量级、直观的 API

### 4. 路由管理
- 配置路由和嵌套路由
- 路由守卫和权限控制
- 懒加载和代码分割

### 5. 组合式函数（Composables）
- 抽取可复用的逻辑
- 与 Vue 响应式系统完美集成
- 提高代码复用性和可维护性

### 6. TypeScript 支持
- 为组件添加类型定义
- Props 和 Emits 类型安全
- 完整的 IDE 智能提示

### 7. 性能优化
- 组件懒加载和异步加载
- 虚拟滚动处理大数据列表
- 计算属性缓存
- KeepAlive 组件缓存

### 8. 测试
- Vitest 单元测试
- Playwright E2E 测试
- Vue Test Utils 组件测试

## 使用方法

### 创建新项目
调用此技能，说明你要创建一个 Vue 项目，它将：
1. 使用 `npm create vue@latest` 初始化项目
2. 根据需求选择 TypeScript、Router、Pinia 等
3. 配置 Vite 和开发环境
4. 创建基础目录结构

### 开发组件
说明你要创建的组件功能，技能将：
1. 创建 `.vue` 单文件组件
2. 使用 Composition API 编写逻辑
3. 添加响应式状态和计算属性
4. 实现组件通信和事件处理

### 添加路由和状态管理
描述你的路由需求或状态结构，技能将：
1. 配置 Vue Router 路由表
2. 创建 Pinia store
3. 实现路由守卫和权限控制
4. 组织模块化的状态管理

### 优化性能
说明遇到的性能问题，技能将：
1. 分析性能瓶颈
2. 实现懒加载和代码分割
3. 优化大列表渲染
4. 添加缓存策略

## 预期输出

使用此技能后，你将得到：

- ✅ **完整的项目结构** - 符合 Vue 最佳实践的目录组织
- ✅ **类型安全的代码** - TypeScript 支持和完整类型定义
- ✅ **可复用的组件** - 模块化、可维护的组件代码
- ✅ **高性能应用** - 优化的构建配置和运行时性能
- ✅ **完善的配置文件** - Vite、TypeScript、ESLint 等配置
- ✅ **测试用例** - 单元测试和 E2E 测试代码
- ✅ **最佳实践** - 遵循 Vue 官方推荐的编码规范

## 技术栈

- **框架**: Vue 3
- **构建工具**: Vite
- **路由**: Vue Router 4
- **状态管理**: Pinia
- **语言**: TypeScript / JavaScript
- **测试**: Vitest + Playwright
- **UI 库**: Element Plus / Ant Design Vue（可选）

## 生态系统集成

此技能集成了 Vue 生态系统的主要工具：

- **Vite** - 极速的开发服务器和构建工具
- **Vue Router** - 官方路由管理
- **Pinia** - 官方状态管理库
- **VueUse** - 常用组合式函数集合
- **Element Plus / Ant Design Vue** - 企业级 UI 组件库
- **Tailwind CSS** - 实用优先的 CSS 框架（可选）

## 示例场景

### 场景 1: 快速创建 CRUD 应用
"帮我创建一个用户管理系统，包含列表、新增、编辑、删除功能"

### 场景 2: 实现复杂表单
"创建一个多步骤表单，包含验证、动态字段和文件上传"

### 场景 3: 构建仪表盘
"搭建一个数据可视化仪表盘，集成 ECharts 图表库"

### 场景 4: 性能优化
"我的列表页有 10000 条数据，渲染很慢，帮我优化"

## 最佳实践

此技能将自动应用以下最佳实践：

- ✅ 使用 Composition API 和 `<script setup>` 语法
- ✅ 组件单一职责原则
- ✅ Props 验证和类型定义
- ✅ 合理使用 `computed` 和 `watch`
- ✅ 避免不必要的响应式包装
- ✅ 路由懒加载和代码分割
- ✅ 使用 ESLint 和 Prettier 保持代码规范
- ✅ 编写测试保证代码质量

## 开始使用

只需告诉我你的需求，例如：

- "创建一个新的 Vue 3 项目"
- "添加一个产品列表组件"
- "实现用户登录和权限控制"
- "优化应用的加载性能"

我将根据最佳实践为你生成高质量的 Vue 代码！
