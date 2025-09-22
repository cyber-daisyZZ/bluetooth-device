<script>
import config from './config'
import { getToken } from '@/utils/auth'

export default {
  onShow: function () {
    uni.authorize({
      scope: 'scope.userLocation',
      success: () => {
        console.log('授权成功')
      },
      fail: () => {
        console.log('授权失败')
      }
    })
    uni.authorize({
      scope: 'scope.bluetooth',
      success: () => {
        console.log('授权成功')
      },
      fail: () => {
        console.log('授权失败')
      }
    })
  },
  onLaunch: function () {
    this.initApp()
  },
  methods: {
    // 初始化应用
    initApp() {
      // 初始化应用配置
      this.initConfig()
      // 检查用户登录状态
      //#ifdef H5
      this.checkLogin()
      //#endif
    },
    initConfig() {
      this.globalData.config = config
    },
    checkLogin() {
      if (!getToken()) {
        this.$tab.reLaunch('/pages/login')
      }
    }
  }
}
</script>

<style lang="scss">
@import '@/static/scss/index.scss'
</style>
