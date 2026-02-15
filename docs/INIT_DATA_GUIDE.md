# 数据库初始化工具使用说明

## 方式一：使用前端页面（推荐）

### 步骤：

1. **上传云函数**
   - 在 HBuilderX 中，右键点击 `uniCloud-alipay/cloudfunctions/init-data` 文件夹
   - 选择"上传部署"

2. **运行项目**
   ```bash
   # 在 HBuilderX 中运行项目到浏览器或小程序
   ```

3. **访问初始化页面**
   - 在浏览器地址栏输入：
   ```
   /pages/admin/init-data
   ```
   - 或在代码中跳转：
   ```javascript
   uni.navigateTo({
     url: '/pages/admin/init-data'
   })
   ```

4. **点击按钮初始化数据**
   - 点击"初始化社区数据（10条）"按钮
   - 等待提示"初始化成功"

---

## 方式二：使用浏览器控制台

### 步骤：

1. **上传云函数**（同方式一）

2. **在浏览器运行项目**

3. **打开浏览器控制台**（F12）

4. **执行以下代码**：

```javascript
// 初始化社区数据
const initData = uniCloud.importObject('init-data')
initData.initCommunities().then(result => {
  console.log('初始化成功:', result)
}).catch(error => {
  console.error('初始化失败:', error)
})
```

---

## 方式三：使用云函数URL化（可选）

### 步骤：

1. **配置云函数URL化**
   - 在 uniCloud Web控制台中配置 `init-data` 云函数的URL化

2. **直接访问URL**
   ```
   https://your-cloud-function-url/initCommunities
   ```

---

## 初始化的数据内容

脚本会添加以下10个虚拟社区：

| 序号 | 社区名称 | 区域 | 用户数 | 任务数 |
|------|---------|------|--------|--------|
| 1 | 阳光花园 | 朝阳区 | 235 | 48 |
| 2 | 绿城小区 | 海淀区 | 412 | 86 |
| 3 | 华府世家 | 西城区 | 168 | 35 |
| 4 | 锦绣江南 | 东城区 | 328 | 72 |
| 5 | 万科城市花园 | 丰台区 | 576 | 124 |
| 6 | 碧桂园翡翠湾 | 石景山区 | 294 | 58 |
| 7 | 保利玫瑰湾 | 通州区 | 445 | 95 |
| 8 | 龙湖香醍溪岸 | 昌平区 | 312 | 67 |
| 9 | 中海国际社区 | 大兴区 | 389 | 81 |
| 10 | 首开国风美唐 | 朝阳区 | 267 | 54 |

---

## 其他功能

### 查看统计信息
```javascript
const initData = uniCloud.importObject('init-data')
initData.getCommunitiesStats().then(stats => {
  console.log('统计信息:', stats)
})
```

### 清空所有社区数据（谨慎使用）
```javascript
const initData = uniCloud.importObject('init-data')
initData.clearCommunities().then(result => {
  console.log('清空成功:', result)
})
```

---

## 注意事项

1. **权限要求**：初始化云函数没有身份验证，建议仅在开发环境使用
2. **重复执行**：可以多次执行初始化，会累加数据（不会覆盖已有数据）
3. **数据清空**：清空操作不可恢复，请谨慎使用
4. **生产环境**：在生产环境部署前，建议删除或禁用此云函数

---

## 文件位置

- 云函数：`uniCloud-alipay/cloudfunctions/init-data/index.obj.js`
- 前端页面：`pages/admin/init-data.vue`
- 数据表结构：`uniCloud-alipay/database/communities.schema.json`

---

## 常见问题

### Q: 提示"云函数不存在"？
A: 确保已经上传部署了 `init-data` 云函数

### Q: 初始化失败？
A: 检查云数据库是否正常，查看控制台错误信息

### Q: 如何验证数据是否插入成功？
A:
1. 访问 uniCloud Web控制台 → 云数据库 → communities 表
2. 或在前端调用 `community-service` 的 `searchCommunities` 方法查询

---

## 快速开始（3步完成）

```bash
# 1. 上传云函数（在 HBuilderX 中右键上传）
uniCloud-alipay/cloudfunctions/init-data

# 2. 运行项目到浏览器

# 3. 浏览器控制台执行
uniCloud.importObject('init-data').initCommunities()
```

完成！🎉
