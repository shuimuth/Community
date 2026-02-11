
<script>
export default {
  onLaunch() {
    console.log('Admin panel launched')
    // Check admin login status
    const token = uni.getStorageSync('admin_token')
    if (!token) {
      uni.reLaunch({ url: '/pages/login/login' })
    }
  },
  onShow() {},
  onHide() {}
}
</script>

<style>
/* Global admin styles */
page {
  background-color: #f5f6f7;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  color: #333;
}

/* Reset */
view, text, image, scroll-view {
  box-sizing: border-box;
}

/* Common utility classes */
.flex {
  display: flex;
}

.flex-1 {
  flex: 1;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.text-primary {
  color: #409EFF;
}

.text-success {
  color: #67C23A;
}

.text-warning {
  color: #E6A23C;
}

.text-danger {
  color: #F56C6C;
}

.text-info {
  color: #909399;
}

.text-bold {
  font-weight: 600;
}

.mt-10 {
  margin-top: 10px;
}

.mt-20 {
  margin-top: 20px;
}

.mb-10 {
  margin-bottom: 10px;
}

.mb-20 {
  margin-bottom: 20px;
}

.ml-10 {
  margin-left: 10px;
}

.mr-10 {
  margin-right: 10px;
}

.p-20 {
  padding: 20px;
}
</style>
