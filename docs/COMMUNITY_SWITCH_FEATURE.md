# 小区切换功能说明

## 功能概述

用户现在可以在"我的小区"页面点击小区卡片来切换首页显示的小区。

## 实现细节

### 1. Store 层改动 (`store/user.ts`)

#### 新增状态
- `currentCommunityId`: 当前选中的小区 ID，持久化存储在本地

#### 新增 Getters
- `currentCommunity`: 返回当前选中的小区对象
- `currentCommunityName`: 返回当前小区名称，用于首页显示

#### 新增 Actions
- `setCurrentCommunity(communityId)`: 设置当前选中的小区

#### 修改的 Actions
- `setCommunities()`: 自动设置默认小区（如果未设置或无效）
- `logout()`: 清除当前小区选择

### 2. 小区管理页面改动 (`pages/community/manage.vue`)

#### 功能变更
- 小区卡片现在可点击
- 点击小区卡片会切换为当前显示的小区
- 当前选中的小区会显示"当前"徽章
- 当前选中的小区卡片有特殊的高亮样式
- 删除按钮使用 `@tap.stop` 防止触发选择事件

#### UI 变更
- 添加了 `community-card--active` 样式类
- 添加了 `community-card__badge` 徽章组件
- 添加了 `community-card__actions` 容器
- 更新了提示文案

#### 事件
- 切换小区后会触发 `uni.$emit('community-changed')` 事件

### 3. 首页改动 (`pages/index/index.vue`)

#### 功能变更
- 使用 `userStore.currentCommunityName` 显示当前小区名称
- 监听 `community-changed` 事件，自动刷新任务列表
- 查询任务时只使用当前选中的小区 ID

#### 生命周期
- `onMounted`: 添加事件监听
- `onUnmounted`: 移除事件监听

## 用户体验流程

1. 用户点击首页左上角的小区名称
2. 进入"我的小区"页面
3. 看到所有已关联的小区，当前显示的小区有"当前"徽章和高亮样式
4. 点击其他小区卡片
5. 显示切换成功提示
6. 返回首页，看到小区名称已更新，任务列表自动刷新为新小区的任务

## 技术要点

### 持久化存储
- 使用 `uni.setStorageSync('current_community_id', id)` 持久化当前选择
- 应用重启后会自动恢复上次选择的小区

### 事件通信
- 使用 `uni.$emit` 和 `uni.$on` 实现跨页面通信
- 确保在组件卸载时使用 `uni.$off` 移除监听器

### 默认行为
- 如果用户只有一个小区，自动选中该小区
- 如果当前选中的小区被删除，自动切换到第一个小区
- 如果没有选中的小区，默认使用第一个小区

## 样式特性

### 当前小区卡片样式
```scss
&--active {
  background: linear-gradient(135deg, rgba(255, 122, 69, 0.05) 0%, rgba(255, 122, 69, 0.02) 100%);
  border: 1.5px solid rgba(255, 122, 69, 0.3);
  box-shadow: 0 2px 12px rgba(255, 122, 69, 0.15);
}
```

### 当前徽章样式
```scss
&__badge {
  padding: 4px 10px;
  background: $brand-gradient;
  border-radius: $uni-border-radius-pill;
  box-shadow: 0 2px 8px rgba(255, 122, 69, 0.25);
}
```

## 测试建议

1. 测试单个小区场景
2. 测试多个小区切换
3. 测试删除当前选中的小区
4. 测试应用重启后是否保持选择
5. 测试切换小区后任务列表是否正确刷新
