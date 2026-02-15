<!-- 用户资料页 -->
<template>
	<view class="uni-content">
		<view class="avatar-section" @click="chooseAvatar">
			<view class="avatar-container">
				<image
					v-if="displayAvatar"
					class="avatar-image"
					:src="displayAvatar"
					mode="aspectFill"
				/>
				<view v-else class="avatar-placeholder">
					<text class="avatar-placeholder__icon">👤</text>
				</view>
				<!-- Camera overlay -->
				<view class="avatar-camera">
					<text class="avatar-camera__icon">📷</text>
				</view>
			</view>
			<text class="avatar-tip">点击更换头像</text>
		</view>
		<uni-list>
			<uni-list-item class="item" @click="setNickname('')" title="昵称" :rightText="userInfo.nickname||'未设置'" link>
			</uni-list-item>
			<uni-list-item class="item" @click="bindMobile" title="手机号" :rightText="userInfo.mobile||'未绑定'" link>
			</uni-list-item>
			<uni-list-item v-if="userInfo.email" class="item" title="电子邮箱" :rightText="userInfo.email">
			</uni-list-item>
			<!-- #ifdef APP -->
      <!-- 如未开通实人认证服务，可以将实名认证入口注释 -->
			<uni-list-item class="item" @click="realNameVerify" title="实名认证" :rightText="realNameStatus !== 2 ? '未认证': '已认证'" link>
			</uni-list-item>
			<!-- #endif -->
			<uni-list-item v-if="hasPwd" class="item" @click="changePassword" title="修改密码" link>
			</uni-list-item>
		</uni-list>
		<!-- #ifndef MP -->
		<uni-list class="mt10">
			<uni-list-item @click="deactivate" title="注销账号" link="navigateTo"></uni-list-item>
		</uni-list>
		<!-- #endif -->
		<uni-popup ref="dialog" type="dialog">
			<uni-popup-dialog mode="input" :value="userInfo.nickname" @confirm="setNickname" :inputType="setNicknameIng?'nickname':'text'"
				title="设置昵称" placeholder="请输入要设置的昵称">
			</uni-popup-dialog>
		</uni-popup>
		<uni-id-pages-bind-mobile ref="bind-mobile-by-sms" @success="bindMobileSuccess"></uni-id-pages-bind-mobile>
		<template v-if="showLoginManage">
			<button v-if="userInfo._id" @click="logout">退出登录</button>
			<button v-else @click="login">去登录</button>
		</template>
	</view>
</template>
<script>
const uniIdCo = uniCloud.importObject("uni-id-co")
  import {
    store,
    mutations
  } from '@/uni_modules/uni-id-pages/common/store.js'
  import { useUserStore } from '@/store/user'
	export default {
    computed: {
      userInfo() {
        return store.userInfo
      },
	  realNameStatus () {
		  if (!this.userInfo.realNameAuth) {
			  return 0
		  }

		  return this.userInfo.realNameAuth.authStatus
	  },
	  displayAvatar() {
		  // Try resolved URL first, then avatar_file url
		  if (this.resolvedAvatarUrl) return this.resolvedAvatarUrl
		  if (this.userInfo.avatar_file && this.userInfo.avatar_file.url) {
			  const url = this.userInfo.avatar_file.url
			  if (url.startsWith('http://') || url.startsWith('https://')) return url
		  }
		  return ''
	  }
    },
		data() {
			return {
				univerifyStyle: {
					authButton: {
						"title": "本机号码一键绑定", // 授权按钮文案
					},
					otherLoginButton: {
						"title": "其他号码绑定",
					}
				},
				// userInfo: {
				// 	mobile:'',
				// 	nickname:''
				// },
				hasPwd: false,
				showLoginManage: false ,//通过页面传参隐藏登录&退出登录按钮
				setNicknameIng:false,
				resolvedAvatarUrl: ''
			}
		},
		async onShow() {
			this.univerifyStyle.authButton.title = "本机号码一键绑定"
			this.univerifyStyle.otherLoginButton.title = "其他号码绑定"
			// Resolve avatar URL
			this.resolveAvatar()
		},
		async onLoad(e) {
			if (e.showLoginManage) {
				this.showLoginManage = true //通过页面传参隐藏登录&退出登录按钮
			}
			//判断当前用户是否有密码，否则就不显示密码修改功能
			let res = await uniIdCo.getAccountInfo()
			this.hasPwd = res.isPasswordSet
		},
		methods: {
			async resolveAvatar() {
				const avatarFile = this.userInfo.avatar_file
				if (!avatarFile || !avatarFile.url) {
					this.resolvedAvatarUrl = ''
					return
				}
				const url = avatarFile.url
				if (url.startsWith('http://') || url.startsWith('https://')) {
					this.resolvedAvatarUrl = url
					return
				}
				if (url.startsWith('cloud://')) {
					try {
						const res = await uniCloud.getTempFileURL({ fileList: [url] })
						if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
							this.resolvedAvatarUrl = res.fileList[0].tempFileURL
						}
					} catch (e) {
						console.error('getTempFileURL error:', e)
					}
				}
			},
			chooseAvatar() {
				if (!store.hasLogin) {
					return uni.navigateTo({
						url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd'
					})
				}
				uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['album', 'camera'],
					success: async (res) => {
						const filePath = res.tempFilePaths[0]
						const extname = filePath.split('.').pop() || 'jpg'
						try {
							uni.showLoading({ title: '上传中...', mask: true })
							const cloudPath = this.userInfo._id + '' + Date.now()
							const uploadRes = await uniCloud.uploadFile({
								filePath,
								cloudPath,
								fileType: 'image'
							})
						if (uploadRes.fileID) {
								const avatar_file = {
									extname: extname,
									name: cloudPath,
									url: uploadRes.fileID
								}
								// Update uni-id-pages store (triggers DB update)
								mutations.updateUserInfo({ avatar_file })
								// Also sync to Pinia userStore so center.vue shows the same avatar
								const userStore = useUserStore()
								if (userStore.userInfo) {
									userStore.setUserInfo({ ...userStore.userInfo, avatar: uploadRes.fileID })
								}
								// Resolve the new avatar URL
								await this.resolveAvatar()
								uni.showToast({ title: '头像更新成功', icon: 'success' })
							}
						} catch (e) {
							console.error('Upload avatar error:', e)
							uni.showToast({ title: '上传失败', icon: 'none' })
						} finally {
							uni.hideLoading()
						}
					}
				})
			},
			login() {
				uni.navigateTo({
					url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd',
					complete: (e) => {
						// console.log(e);
					}
				})
			},
			logout() {
				mutations.logout()
			},
			bindMobileSuccess() {
				mutations.updateUserInfo()
			},
			changePassword() {
				uni.navigateTo({
					url: '/uni_modules/uni-id-pages/pages/userinfo/change_pwd/change_pwd',
					complete: (e) => {
						// console.log(e);
					}
				})
			},
			bindMobile() {
				// #ifdef APP-PLUS
				uni.preLogin({
					provider: 'univerify',
					success: this.univerify(), //预登录成功
					fail: (res) => { // 预登录失败
						// 不显示一键登录选项（或置灰）
						console.log(res)
						this.bindMobileBySmsCode()
					}
				})
				// #endif

				// #ifdef MP-WEIXIN
				this.$refs['bind-mobile-by-sms'].open()
				// #endif

				// #ifdef H5
				//...去用验证码绑定
				this.bindMobileBySmsCode()
				// #endif
			},
			univerify() {
				uni.login({
					"provider": 'univerify',
					"univerifyStyle": this.univerifyStyle,
					success: async e => {
						uniIdCo.bindMobileByUniverify(e.authResult).then(res => {
							mutations.updateUserInfo()
						}).catch(e => {
							console.log(e);
						}).finally(e => {
							// console.log(e);
							uni.closeAuthView()
						})
					},
					fail: (err) => {
						console.log(err);
						if (err.code == '30002' || err.code == '30001') {
							this.bindMobileBySmsCode()
						}
					}
				})
			},
			bindMobileBySmsCode() {
				uni.navigateTo({
					url: './bind-mobile/bind-mobile'
				})
			},
			setNickname(nickname) {
				if (nickname) {
					mutations.updateUserInfo({
						nickname
					})
					this.setNicknameIng = false
					this.$refs.dialog.close()
				} else {
					this.$refs.dialog.open()
				}
			},
			deactivate(){
				uni.navigateTo({
					url:"/uni_modules/uni-id-pages/pages/userinfo/deactivate/deactivate"
				})
			},
			async bindThirdAccount(provider) {
				const uniIdCo = uniCloud.importObject("uni-id-co")
				const bindField = {
					weixin: 'wx_openid',
					alipay: 'ali_openid',
					apple: 'apple_openid',
					qq: 'qq_openid'
				}[provider.toLowerCase()]

				if (this.userInfo[bindField]) {
					await uniIdCo['unbind' + provider]()
					await mutations.updateUserInfo()
				} else {
					uni.login({
						provider: provider.toLowerCase(),
						onlyAuthorize: true,
						success: async e => {
							const res = await uniIdCo['bind' + provider]({
								code: e.code
							})
							if (res.errCode) {
								uni.showToast({
									title: res.errMsg || '绑定失败',
									duration: 3000
								})
							}
							await mutations.updateUserInfo()
						},
						fail: async (err) => {
							console.log(err);
							uni.hideLoading()
						}
					})
				}
			},
			realNameVerify () {
				uni.navigateTo({
					url: "/uni_modules/uni-id-pages/pages/userinfo/realname-verify/realname-verify"
				})
			}
		}
	}
</script>
<style lang="scss" scoped>
	@import "@/uni_modules/uni-id-pages/common/login-page.scss";

	.uni-content {
		padding: 0;
	}

	/* Avatar section */
	.avatar-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 40rpx 0 30rpx;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.avatar-container {
		position: relative;
		width: 180rpx;
		height: 180rpx;
		border-radius: 50%;
		overflow: hidden;
		border: 6rpx solid rgba(255, 255, 255, 0.5);
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
	}

	.avatar-image {
		width: 100%;
		height: 100%;
		border-radius: 50%;
	}

	.avatar-placeholder {
		width: 100%;
		height: 100%;
		background-color: rgba(255, 255, 255, 0.25);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-placeholder__icon {
		font-size: 70rpx;
		opacity: 0.7;
	}

	.avatar-camera {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 48rpx;
		background-color: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-camera__icon {
		font-size: 24rpx;
		line-height: 1;
	}

	.avatar-tip {
		margin-top: 16rpx;
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.8);
	}

	/* #ifndef APP-NVUE */
	view {
		display: flex;
		box-sizing: border-box;
		flex-direction: column;
	}

	@media screen and (min-width: 690px) {
		.uni-content {
			padding: 0;
			max-width: 690px;
			margin-left: calc(50% - 345px);
			border: none;
			max-height: none;
			border-radius: 0;
			box-shadow: none;
		}
	}

	/* #endif */
	.avatar {
		align-items: center;
		justify-content: center;
		margin: 22px 0;
		width: 100%;
	}

	.item {
		flex: 1;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
	}

	button {
		margin: 10%;
		margin-top: 40px;
		border-radius: 0;
		background-color: #FFFFFF;
		width: 80%;
	}

	.mt10 {
		margin-top: 10px;
	}
</style>
