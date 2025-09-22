<template>
	<view class="device-container">
		<!-- 浓度数据 -->
		<view class="section">
			<view class="section-header">
				<view class="blue-bar"></view>
				<text class="section-title">浓度数据</text>
			</view>
			<view class="section-content">
				<button class="action-btn" :class="{ 'disabled': !isBluetoothConnected }" @click="handleStartReading">
					{{ isBluetoothConnected ? '开始读取' : '连接蓝牙设备' }}
				</button>
				<view v-if="isBluetoothConnected" class="device-info">
					<text class="device-name">已连接: {{ bluetoothDeviceName }}</text>
					<button class="disconnect-btn" @click="handleDisconnect">断开连接</button>
				</view>
				<view v-if="showScanDeviceList" class="bluetooth-device-list">
					<view v-for="device in scanDeviceList" :key="device.id" class="bluetooth-device-item">
						<text class="bluetooth-name">{{ device.name || device.deviceId }}</text>
						<button class="connect-btn" @click="selectScanDevice(device)">连接</button>
					</view>
				</view>
				<view class="data-display">
					<text class="label">浓度值 (C0):</text>
					<text class="value">{{ concentrationValue }}</text>
				</view>
				<button v-if="isBluetoothConnected" class="action-btn" @click="getDeviceService">获取设备服务</button>
			</view>
		</view>

		<!-- 基础数据 -->
		<view class="section">
			<view class="section-header">
				<view class="blue-bar"></view>
				<text class="section-title">基础数据</text>
			</view>
			<view class="section-content">
				<view class="subsection">
					<text class="subsection-title">分组</text>
					<view class="input-grid">
						<view class="input-row">
							<view class="input-item mr-20">
								<text class="input-label">C01</text>
								<input v-model="groupData.C01" class="input-field" type="number" placeholder="0" />
							</view>
							<view class="input-item">
								<text class="input-label">C02</text>
								<input v-model="groupData.C02" class="input-field" type="number" placeholder="0" />
							</view>
						</view>
						<view class="input-row">
							<view class="input-item mr-20">
								<text class="input-label">C03</text>
								<input v-model="groupData.C03" class="input-field" type="number" placeholder="0" />
							</view>
							<view class="input-item">
								<text class="input-label">C04</text>
								<input v-model="groupData.C04" class="input-field" type="number" placeholder="0" />
							</view>
						</view>
						<view class="input-row">
							<view class="input-item mr-20">
								<text class="input-label">C05</text>
								<input v-model="groupData.C05" class="input-field" type="number" placeholder="0" />
							</view>
							<view class="input-item">
								<text class="input-label">C06</text>
								<input v-model="groupData.C06" class="input-field" type="number" placeholder="0" />
							</view>
						</view>
					</view>
				</view>
				<view class="data-display">
					<text class="label">时间:</text>
					<text class="value">{{ currentTime }}</text>
				</view>
				<view class="data-display">
					<text class="label">GPS:</text>
					<text class="value">{{ gpsLocation }}</text>
				</view>
				<view v-if="gpsError" class="data-display">
					<text class="label">GPS ERROR</text>
					<text class="value" @click="initGPS">{{ gpsError }}</text>
				</view>
			</view>
		</view>

		<!-- 校正因子 -->
		<view class="section">
			<view class="section-header">
				<view class="blue-bar"></view>
				<text class="section-title">校正因子</text>
			</view>
			<view class="section-content">
				<button class="action-btn" @click="handleStartCalculation">开始计算</button>
				<view class="data-display">
					<text class="label">校正因子:</text>
					<text class="value">{{ correctionFactor }}</text>
				</view>
				<button class="action-btn" @click="handleSubmitCorrection">提交校正因子</button>
				<view class="data-display">
					<text class="label">提交结果:</text>
					<text class="value" :class="{ 'success': submitResult === '成功' }">{{ submitResult }}</text>
				</view>
			</view>
		</view>

		<!-- 导出数据 -->
		<view class="section">
			<view class="section-content">
				<button class="action-btn" @click="handleExportData">导出数据</button>
			</view>
		</view>
	</view>
</template>

<script>
import bluetoothManager from '@/utils/bluetooth.js'

export default {
	data() {
		return {
			// 蓝牙连接状态
			isBluetoothConnected: false,
			bluetoothDeviceId: '',
			bluetoothDeviceName: '',

			// 浓度数据
			concentrationValue: 0,

			// 基础数据
			groupData: {
				C01: '',
				C02: '',
				C03: '',
				C04: '',
				C05: '',
				C06: ''
			},

			// 时间
			currentTime: '',
			timeInterval: null,

			// GPS位置
			gpsError: '',
			gpsLocation: '--',
			watchId: null,

			// 校正因子
			correctionFactor: 0,

			// 提交结果
			submitResult: '',

			// 蓝牙设备列表
			deviceList: [],
			showDeviceList: false,

			// IOS ANDROID
			scanDeviceList: [],
			showScanDeviceList: false,
			scanResolve: null,
			scanReject: null,
		}
	},
	onLoad() {
		this.initTime();
		this.initGPS();
		this.checkBluetoothStatus();
	},
	onUnload() {
		// 清理定时器和GPS监听
		if (this.timeInterval) {
			clearInterval(this.timeInterval);
		}
		if (this.watchId) {
			uni.stopLocationUpdate();
		}
	},
	methods: {
		// 初始化时间显示
		initTime() {
			this.updateTime();
			this.timeInterval = setInterval(() => {
				this.updateTime();
			}, 1000);
		},

		// 更新时间
		updateTime() {
			const now = new Date();
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const day = String(now.getDate()).padStart(2, '0');
			const hours = String(now.getHours()).padStart(2, '0');
			const minutes = String(now.getMinutes()).padStart(2, '0');
			const seconds = String(now.getSeconds()).padStart(2, '0');
			this.currentTime = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
		},

		// 初始化GPS
		initGPS() {
			// #ifdef APP-PLUS
			uni.getLocation({
				type: 'wgs84',
				success: (res) => {
					this.updateGPSLocation(res.latitude, res.longitude);
				},
				fail: (err) => {
					console.log('GPS获取失败:', err);
					this.gpsError = err
					this.gpsLocation = 'GPS获取失败';
				}
			});

			// 持续监听位置变化
			uni.startLocationUpdate({
				success: () => {
					uni.onLocationChange((res) => {
						this.updateGPSLocation(res.latitude, res.longitude);
					});
				},
				fail: (err) => {
					console.log('GPS监听启动失败:', err);
					this.gpsError = err;
				}
			});
			// #endif

			// #ifdef H5
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition((position) => {
					this.updateGPSLocation(position.coords.latitude, position.coords.longitude);
				}, (error) => {
					console.log('GPS获取失败:', error);
					this.gpsLocation = 'GPS获取失败';
					this.gpsError = error.message;
				});
			} else {
				this.gpsLocation = '浏览器不支持GPS';
			}
			// #endif
		},

		// 更新GPS位置显示
		updateGPSLocation(latitude, longitude) {
			const latDeg = Math.floor(latitude);
			const latMin = Math.floor((latitude - latDeg) * 60);
			const lngDeg = Math.floor(longitude);
			const lngMin = Math.floor((longitude - lngDeg) * 60);

			this.gpsLocation = `北纬${latDeg}度${latMin}分,东经${lngDeg}度${lngMin}分`;
			this.gpsError = '';
		},

		// 检查蓝牙状态
		async checkBluetoothStatus() {
			try {
				await bluetoothManager.checkBluetoothAvailable();
				const status = bluetoothManager.getConnectionStatus();
				this.isBluetoothConnected = status.isConnected;
				this.bluetoothDeviceId = status.deviceId;
				this.bluetoothDeviceName = status.deviceName;
			} catch (error) {
				console.log('蓝牙检查失败:', error);
				this.isBluetoothConnected = false;
			}
		},

		// 处理开始读取
		handleStartReading() {
			if (!this.isBluetoothConnected) {
				this.connectBluetooth();
			} else {
				this.startReadingData();
			}
		},

		selectScanDevice(device) {
			this.scanResolve([device]);
			this.showScanDeviceList = false;
			this.scanDeviceList = [];
			this.scanResolve = null;
			this.scanReject = null;
			uni.stopBluetoothDevicesDiscovery();
		},

		// 连接蓝牙
		async connectBluetooth() {
			this.scanDeviceList = [];
			try {
				uni.showLoading({
					title: '扫描设备中...'
				});

				// 扫描蓝牙设备
				const devices = await bluetoothManager.scanDevices((device, resolve, reject) => {
					this.scanDeviceList.push(device);
					uni.hideLoading();
					this.showScanDeviceList = true;
					this.scanResolve = resolve;
					this.scanReject = reject;
				});
				this.deviceList = devices;

				uni.hideLoading();

				if (devices.length === 0) {
					uni.showModal({
						title: '蓝牙连接',
						content: '未找到可用的蓝牙设备，请确保设备已开启并处于可发现状态',
						showCancel: false
					});
					return;
				}
				// 显示设备选择列表
				this.showDeviceSelection();
			} catch (error) {
				uni.hideLoading();
				console.log('蓝牙连接失败:', error);

				uni.showModal({
					title: '连接失败',
					content: error,
					showCancel: false
				});
			}
		},

		// 显示设备选择
		showDeviceSelection() {
			const deviceNames = this.deviceList.map(device => device.name || device.deviceId);

			uni.showActionSheet({
				itemList: deviceNames,
				success: (res) => {
					const selectedDevice = this.deviceList[res.tapIndex];
					this.connectToDevice(selectedDevice);
				},
				fail: () => {
					console.log('用户取消选择设备');
				}
			});
		},

		// 连接到指定设备
		async connectToDevice(device) {
			try {
				uni.showLoading({
					title: '连接中...'
				});

				const result = await bluetoothManager.connectDevice(device);

				uni.hideLoading();

				if (result.success) {
					this.isBluetoothConnected = true;
					this.bluetoothDeviceId = result.deviceId;
					this.bluetoothDeviceName = result.name || result.deviceId;

					uni.showToast({
						title: '连接成功',
						icon: 'success'
					});
				}
			} catch (error) {
				uni.hideLoading();
				console.log('设备连接失败:', error);
				uni.showToast({
					title: '连接失败',
					icon: 'error'
				});
			}
		},

		getDeviceService() {
			uni.getBLEDeviceServices({
				deviceId: this.bluetoothDeviceId,
				success(res) {
					console.log(res)
					uni.showModal({
						title: '设备服务',
						content: JSON.stringify(res),
						showCancel: false
					});
				},
				fail(err) {
					console.error(err)
					uni.showToast({
						title: '获取设备服务失败',
						icon: 'error'
					});
				}
			})
		},

		// 开始读取数据
		async startReadingData() {
			try {
				uni.showLoading({
					title: '读取中...'
				});

				// 从蓝牙设备读取数据
				const data = await bluetoothManager.readData();

				uni.hideLoading();

				// 更新浓度值
				this.concentrationValue = data.concentration;

				// 可以选择性地更新其他数据
				console.log('读取到的完整数据:', data);

				uni.showToast({
					title: '读取成功',
					icon: 'success'
				});
			} catch (error) {
				uni.hideLoading();
				console.log('数据读取失败:', error);
				uni.showToast({
					title: '读取失败',
					icon: 'error'
				});
			}
		},

		// 断开蓝牙连接
		async handleDisconnect() {
			try {
				uni.showLoading({
					title: '断开连接中...'
				});

				await bluetoothManager.disconnectDevice();

				uni.hideLoading();

				this.isBluetoothConnected = false;
				this.bluetoothDeviceId = '';
				this.bluetoothDeviceName = '';

				uni.showToast({
					title: '已断开连接',
					icon: 'success'
				});
			} catch (error) {
				uni.hideLoading();
				console.log('断开连接失败:', error);
				uni.showToast({
					title: '断开失败',
					icon: 'error'
				});
			}
		},

		// 开始计算
		handleStartCalculation() {
			// 验证浓度数据
			if (!this.concentrationValue || this.concentrationValue <= 0) {
				uni.showToast({
					title: '请先读取浓度数据',
					icon: 'none'
				});
				return;
			}

			// 验证分组数据
			const validValues = Object.values(this.groupData).filter(value =>
				value && !isNaN(value) && parseFloat(value) > 0
			);

			if (validValues.length === 0) {
				uni.showToast({
					title: '请至少输入一个有效的分组数据',
					icon: 'none'
				});
				return;
			}

			uni.showLoading({
				title: '计算中...'
			});

			// 模拟计算过程
			setTimeout(() => {
				uni.hideLoading();

				// 计算逻辑：
				// 1. 计算分组数据的平均值
				// 2. 计算标准差
				// 3. 基于浓度值和平均值计算校正因子
				// 4. 应用标准差进行修正

				const values = validValues.map(v => parseFloat(v));
				const average = values.reduce((sum, val) => sum + val, 0) / values.length;

				// 计算标准差
				const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values
					.length;
				const stdDev = Math.sqrt(variance);

				// 计算基础校正因子
				let baseCorrection = (average / this.concentrationValue) * 100;

				// 应用标准差修正（标准差越小，校正因子越稳定）
				const stabilityFactor = Math.max(0.8, 1 - (stdDev / average) * 0.5);
				this.correctionFactor = Math.round(baseCorrection * stabilityFactor);

				// 确保校正因子在合理范围内
				this.correctionFactor = Math.max(50, Math.min(200, this.correctionFactor));

				uni.showToast({
					title: '计算完成',
					icon: 'success'
				});
			}, 1500);
		},

		// 提交校正因子
		handleSubmitCorrection() {
			uni.showLoading({
				title: '提交中...'
			});

			// 模拟提交过程
			setTimeout(() => {
				uni.hideLoading();
				this.submitResult = '成功';
				uni.showToast({
					title: '提交成功',
					icon: 'success'
				});
			}, 1000);
		},

		// 导出数据
		handleExportData() {
			const exportData = {
				concentrationValue: this.concentrationValue,
				groupData: this.groupData,
				currentTime: this.currentTime,
				gpsLocation: this.gpsLocation,
				correctionFactor: this.correctionFactor,
				submitResult: this.submitResult
			};

			// #ifdef APP-PLUS
			// 在APP中可以保存到文件
			uni.showModal({
				title: '导出数据',
				content: JSON.stringify(exportData, null, 2),
				showCancel: false
			});
			// #endif

			// #ifdef H5
			// 在H5中可以下载文件
			const dataStr = JSON.stringify(exportData, null, 2);
			const dataBlob = new Blob([dataStr], {
				type: 'application/json'
			});
			const url = URL.createObjectURL(dataBlob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `device_data_${new Date().getTime()}.json`;
			link.click();
			URL.revokeObjectURL(url);

			uni.showToast({
				title: '导出成功',
				icon: 'success'
			});
			// #endif
		}
	}
}
</script>

<style lang="scss" scoped>
.device-container {
	padding: 20rpx;
	background-color: #f5f5f5;
	min-height: 100vh;
}

.section {
	background-color: #ffffff;
	border-radius: 16rpx;
	margin-bottom: 20rpx;
	overflow: hidden;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.section-header {
	display: flex;
	align-items: center;
	padding: 20rpx 30rpx;
	background-color: #f8f9fa;
	border-bottom: 1rpx solid #e9ecef;
}

.blue-bar {
	width: 8rpx;
	height: 32rpx;
	background-color: #007aff;
	border-radius: 4rpx;
	margin-right: 16rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333333;
}

.section-content {
	padding: 30rpx;
}

.subsection {
	margin-bottom: 30rpx;
}

.subsection-title {
	font-size: 28rpx;
	font-weight: 500;
	color: #666666;
	margin-bottom: 20rpx;
	display: block;
}

.input-grid {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.input-row {
	display: flex;
}

.input-item {
	flex: 1;
	display: flex;
	flex-direction: column;
}

.mr-20 {
	margin-right: 20rpx;
}

.input-label {
	font-size: 24rpx;
	color: #666666;
	margin-bottom: 8rpx;
}

.input-field {
	height: 80rpx;
	border: 2rpx solid #e9ecef;
	border-radius: 8rpx;
	padding: 0 20rpx;
	font-size: 28rpx;
	background-color: #ffffff;
}

.action-btn {
	width: 100%;
	height: 88rpx;
	background-color: #007aff;
	color: #ffffff;
	border: none;
	border-radius: 12rpx;
	font-size: 32rpx;
	font-weight: 500;
	margin-bottom: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;

	&.disabled {
		background-color: #cccccc;
		color: #999999;
	}

	&:active {
		background-color: #0056b3;
	}
}

.data-display {
	display: flex;
	align-items: center;
	margin-bottom: 16rpx;

	&:last-child {
		margin-bottom: 0;
	}
}

.label {
	font-size: 28rpx;
	color: #666666;
	margin-right: 16rpx;
	min-width: 160rpx;
}

.value {
	font-size: 28rpx;
	color: #333333;
	font-weight: 500;

	&.success {
		color: #28a745;
	}
}

.device-info {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20rpx;
	padding: 16rpx;
	background-color: #f8f9fa;
	border-radius: 8rpx;
}

.device-name {
	font-size: 24rpx;
	color: #666666;
}

.disconnect-btn {
	height: 60rpx;
	padding: 0 20rpx;
	background-color: #dc3545;
	color: #ffffff;
	border: none;
	border-radius: 8rpx;
	font-size: 24rpx;
}

.bluetooth-device-list {
	display: flex;
	flex-direction: column;
	height: 400rpx;
	background-color: #f8f9fa;
	border-radius: 8rpx;
	padding: 0 20rpx;
	overflow-y: auto;
	margin-bottom: 20rpx;
}

.bluetooth-device-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-left: 10rpx;
	margin: 20rpx 0;
	background-color: #fff;
}

.bluetooth-name {
	flex: 1;
	font-size: 24rpx;
	color: #666666;
}

.connect-btn {
	height: 60rpx;
	padding: 0 20rpx;
	background-color: #007aff;
	color: #ffffff;
	font-size: 24rpx;
}
</style>