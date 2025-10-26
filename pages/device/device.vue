<template>
	<view class="device-container">
		<view v-if="!isBluetoothConnected" class="connection-section">
			<button class="primary-btn connection-btn" @click="handleConnectBluetooth">
				<text>{{ showScanDeviceList ? '取消搜索' : '搜索设备' }}</text>
			</button>
		</view>
		<view v-if="isBluetoothConnected" class="connected-section">
			<view class="device-status">
				<view class="status-indicator connected"></view>
				<text class="device-name">已连接: {{ bluetoothDeviceName }}</text>
			</view>
			<button class="disconnect-btn" @click="handleDisconnect">
				<text>断开连接</text>
			</button>
		</view>

		<!-- 设备列表 -->
		<view v-if="showScanDeviceList" class="card device-list-card">
			<view class="card-header">
				<text class="card-title">可用设备</text>
			</view>
			<scroll-view scroll-y="true" class="device-list">
				<view v-for="device in scanDeviceListComputed" :key="device.id" class="device-item">
					<view class="device-info">
						<text class="device-name">{{ device.name || device.deviceId }}</text>
					</view>
					<button class="connect-device-btn" @click="selectScanDevice(device)">
						<text>连接</text>
					</button>
				</view>
			</scroll-view>
		</view>
	

		<!-- 基础数据 -->
		<view class="card data-card">
			<view class="card-header">
				<text class="card-title">基础数据</text>
			</view>
			<view class="card-content">
				<!-- 添加分组区域 -->
				<view class="add-group-section">
					<view class="input-group">
						<view class="input-with-clear">
							<input v-model="groupName" class="group-input" placeholder="请输入分组名称" />
							<view v-if="groupName" class="clear-btn" @click="clearGroupName">×</view>
						</view>
						<button class="add-group-btn" @click="handleAddGroup">
							<text>添加分组</text>
						</button>
					</view>
				</view>

				<!-- 读取按钮 -->
				<view class="action-section">
					<button class="primary-btn read-btn"
						:class="{ 'disabled': !isBluetoothConnected, 'loading': isReading }"
						@click="handleStartReading">
						<text>{{ isReading ? '读取中...' : '开始读取' }}</text>
					</button>
				</view>

				<!-- 分组列表 -->
				<view class="groups-section" v-if="groups.length > 0">
					<view class="group-item" v-for="(group, index) in groups" :key="index"
						:class="{ 'active': activeGroupIndex === index }" @click="handleActiveGroup(index)">
						<view class="group-header">
							<view class="group-info">
								<text class="group-name">{{ group.name }}</text>
							</view>
							<button class="delete-group-btn" @click.stop="handleRemoveGroup(index)">
								<text style="font-size: 24rpx;color: #fff;">删除</text>
							</button>
						</view>
						<view class="group-content">
							<view class="data-grid">
								<view class="data-item">
									<text class="data-label">C01</text>
									<input v-model="group.data.C01" class="data-input" type="number" placeholder="0" />
								</view>
								<view class="data-item">
									<text class="data-label">C02</text>
									<input v-model="group.data.C02" class="data-input" type="number" placeholder="0" />
								</view>
								<view class="data-item">
									<text class="data-label">C03</text>
									<input v-model="group.data.C03" class="data-input" type="number" placeholder="0" />
								</view>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>


		<!-- 备注和时间信息 -->
		<view class="card info-card">
			<view class="card-header">
				<text class="card-title">备注信息</text>
			</view>
			<view class="card-content">
				<textarea class="note-textarea" placeholder="请输入备注信息..." />
			</view>
		</view>

		<!-- 时间和位置信息 -->
		<view class="card location-card">
			<view class="card-header">
				<text class="card-title">时间与位置</text>
			</view>
			<view class="card-content">
				<view class="info-grid">
					<view class="info-item">
						<view class="info-content">
							<text class="info-label">当前时间</text>
							<text class="info-value">{{ currentTime }}</text>
						</view>
					</view>
					<view class="info-item">
						<view class="info-content">
							<text class="info-label">GPS位置</text>
							<text class="info-value">{{ gpsLocation }}</text>
						</view>
					</view>
				</view>
				<view v-if="gpsError" class="error-section">
					<text class="error-text" @click="initGPS">{{ gpsError }}</text>
				</view>
				<button class="refresh-btn" @click="() => { initGPS(); updateTime() }">
					<text>刷新信息</text>
				</button>
			</view>
		</view>

		<!-- 校正因子 -->
		<view class="card correction-card">
			<view class="card-header">
				<text class="card-title">校正因子</text>
			</view>
			<view class="card-content">
				<view class="correction-section">
					<view class="correction-action">
						<button class="primary-btn correction-btn" @click="handleStartCalculation">
							<text>计算校正因子</text>
						</button>
						<view class="correction-result">
							<text class="result-label">校正因子:</text>
							<text class="result-value">{{ correctionFactor }}</text>
						</view>
					</view>
				</view>

				<view class="submit-section">
					<view class="submit-action">
						<button class="primary-btn submit-btn" @click="handleSubmitCorrection">
							<text>提交校正因子</text>
						</button>
						<view class="submit-result">
							<text class="result-label">提交结果:</text>
							<text class="result-value" :class="{ 'success': submitResult === '成功' }">{{ submitResult
								}}</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 导出数据 -->
		<view class="card export-card">
			<view class="card-header">
				<text class="card-title">数据导出</text>
			</view>
			<view class="card-content">
				<button class="export-btn" @click="handleExportData">
					<text>导出数据</text>
				</button>
			</view>
		</view>
	</view>
</template>

<script>
import bluetoothManager from '@/utils/bluetooth.js'

function ab2hex(buffer) {
	const hexArr = Array.prototype.map.call(
		new Uint8Array(buffer),
		function (bit) {
			return ('00' + bit.toString(16)).slice(-2)
		}
	)
	return hexArr.join('')
}

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
			isReading: false,
			groupName: '',
			groups: [],
			activeGroupIndex: 0,

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
	computed: {
		scanDeviceListComputed() {
			const filterObj = {}
			this.scanDeviceList.forEach((device) => {
				filterObj[device.deviceId] = device
			})
			return Object.values(filterObj)
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
		handleAddGroup() {
			if (!this.groupName) {
				uni.showToast({
					title: '请输入分组名称',
					icon: 'none'
				});
				return;
			}
			if (this.groups.find(group => group.name === this.groupName)) {
				uni.showToast({
					title: '分组名称已存在',
					icon: 'none'
				});
				return;
			}
			this.groups.push({
				name: this.groupName,
				data: {
					C01: '',
					C02: '',
					C03: ''
				}
			});
			this.activeGroupIndex = this.groups.length - 1;
			this.groupName = '';
		},
		handleActiveGroup(index) {
			this.activeGroupIndex = index;
		},
		handleRemoveGroup(index) {
			uni.showModal({
				title: '删除分组',
				content: '确定删除该分组吗？',
				success: (res) => {
					if (res.confirm) {
						this.groups.splice(index, 1);
						this.activeGroupIndex = this.groups.length - 1;
					}
				}
			});
		},

		handleConnectBluetooth() {
			if (this.showScanDeviceList) {
				uni.stopBluetoothDevicesDiscovery()
				this.scanDeviceList = []
				this.showScanDeviceList = false
			} else {
				this.connectBluetooth();
			}
		},

		// 初始化时间显示
		initTime() {
			this.updateTime();
			// this.timeInterval = setInterval(() => {
			// 	this.updateTime();
			// }, 1000);
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

			this.gpsLocation = `北纬${latDeg}.${latMin},东经${lngDeg}.${lngMin}`;
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
			if (this.groups.length === 0) {
				uni.showToast({
					title: '请先添加分组',
					icon: 'none'
				});
				return;
			}
			if (!this.isBluetoothConnected) {
				uni.showToast({
					title: '请先连接设备',
					icon: 'none'
				});
				return;
			}
			this.startReadingData();
		},

		selectScanDevice(device) {
			this.scanResolve(device);
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
				const selectedDevice = await bluetoothManager.scanDevices((device) => {
					this.scanDeviceList.push(...device);
				}, (resolve, reject) => {
					this.showScanDeviceList = true;
					this.scanResolve = resolve;
					this.scanReject = reject;
				});

				if(selectedDevice) {
					this.connectToDevice(selectedDevice);
				}
			} catch (error) {
				console.log('蓝牙连接失败:', error);
				uni.showModal({
					title: '连接失败',
					content: error,
					showCancel: false
				});
			}
		},

		// 连接到指定设备
		async connectToDevice(device) {
			try {
				uni.showLoading({
					title: '连接中...'
				});

				// const result = await bluetoothManager.connectDevice(device);
				await new Promise(resolve => setTimeout(resolve, 1000));
				const result = {
					success: true,
					deviceId: device.deviceId,
					name: device.name
				};
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
				// const data = await bluetoothManager.readData();
				await new Promise(resolve => setTimeout(resolve, 1000));
				const data = {
					concentration: 100,
					temperature: 20.0,
					humidity: 40.0,
					timestamp: new Date().getTime()
				};

				uni.hideLoading();
				this.groups[this.activeGroupIndex].data.C01 = data.concentration;
				this.groups[this.activeGroupIndex].data.C02 = data.temperature;
				this.groups[this.activeGroupIndex].data.C03 = data.humidity;
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
			// 验证分组数据
			const validValues = this.groups.filter(group => group.data.C01 && !isNaN(group.data.C01) && parseFloat(
				group.data.C01) > 0 &&
				group.data.C02 && !isNaN(group.data.C02) && parseFloat(group.data.C02) > 0 &&
				group.data.C03 && !isNaN(group.data.C03) && parseFloat(group.data.C03) > 0
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
				this.correctionFactor = 100;
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

		// 清空分组名称
		clearGroupName() {
			this.groupName = '';
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
	background: linear-gradient(180deg, #f2f3f7 0%, #f2f3f7 100%);
	min-height: 100vh;
}

/* 页面标题 */
.page-header {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 30rpx 0;
	margin-bottom: 30rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 20rpx;
	box-shadow: 0 8rpx 32rpx rgba(102, 126, 234, 0.3);
}

.page-title {
	font-size: 36rpx;
	font-weight: 700;
	color: #2e3a4d;
	text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}

/* 卡片通用样式 */
.card {
	background: #ffffff;
	border-radius: 20rpx;
	margin: 30rpx 0;
	box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
	overflow: hidden;
	transition: all 0.3s ease;

	&:hover {
		transform: translateY(-4rpx);
		box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.15);
	}
}

.card-header {
	display: flex;
	align-items: center;
	padding: 30rpx;
	// background: linear-gradient(135deg, #c8e5ff 0%, #cdefff 100%);
	color: #2e3a4d;
}

.card-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #2e3a4d;
}

.card-content {
	padding: 30rpx;
}

/* 连接区域样式 */
.connection-section {
	text-align: center;
}

.connection-btn {
	width: 100%;
	height: 100rpx;
	background: linear-gradient(135deg, #1a94ff 0%, #40B9FE 100%);
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	font-weight: 600;
	color: #ffffff;
	border: none;
	box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.3);
	transition: all 0.3s ease;

	&:active {
		transform: scale(0.98);
	}
}

.connected-section {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.device-status {
	display: flex;
	align-items: center;
	flex: 1;
}

.status-indicator {
	width: 20rpx;
	height: 20rpx;
	border-radius: 50%;
	margin-right: 20rpx;

	&.connected {
		background: #4CAF50;
		box-shadow: 0 0 10rpx rgba(76, 175, 80, 0.5);
	}
}

.device-name {
	font-size: 28rpx;
	color: #333333;
	font-weight: 500;
}

.disconnect-btn {
	height: 80rpx;
	padding: 0 30rpx;
	background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
	color: #ffffff;
	border: none;
	border-radius: 12rpx;
	font-size: 26rpx;
	font-weight: 500;
	display: flex;
	align-items: center;
	box-shadow: 0 4rpx 16rpx rgba(255, 107, 107, 0.3);
	transition: all 0.3s ease;

	&:active {
		transform: scale(0.98);
	}
}

/* 设备列表样式 */
.device-list {
	max-height: 600rpx;
}

.device-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12rpx 20rpx;
	margin: 20rpx;
	background: #f8f9fa;
	border-radius: 16rpx;
	border: 2rpx solid transparent;
	transition: all 0.3s ease;

	&:hover {
		border-color: #667eea;
		background: #f0f2ff;
	}
}

.device-info {
	display: flex;
	align-items: center;
	margin-right: 20rpx;
	flex: 1;
}

.connect-device-btn {
	height: 80rpx;
	padding: 0 30rpx;
	background: linear-gradient(135deg, #1a94ff 0%, #40B9FE 100%);
	color: #ffffff;
	border: none;
	border-radius: 12rpx;
	font-size: 26rpx;
	font-weight: 500;
	display: flex;
	align-items: center;
	box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.3);
	transition: all 0.3s ease;

	&:active {
		transform: scale(0.98);
	}
}

/* 基础数据样式 */
.add-group-section {
	margin-bottom: 30rpx;
}

.input-group {
	display: flex;
	gap: 20rpx;
	align-items: center;
}

.input-with-clear {
	position: relative;
	flex: 1;
}

.group-input {
	width: 100%;
	height: 80rpx;
	border: 2rpx solid #e9ecef;
	border-radius: 16rpx;
	padding: 0 50rpx 0 20rpx;
	font-size: 28rpx;
	background-color: #ffffff;
	transition: all 0.3s ease;

	&:focus {
		border-color: #667eea;
		box-shadow: 0 0 0 4rpx rgba(102, 126, 234, 0.1);
	}
}

.clear-btn {
	position: absolute;
	right: 15rpx;
	top: 50%;
	transform: translateY(-50%);
	width: 40rpx;
	height: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #cccccc;
	color: #ffffff;
	border-radius: 50%;
	font-size: 24rpx;
	font-weight: bold;
	cursor: pointer;
	transition: all 0.3s ease;

	&:active {
		background-color: #999999;
		transform: translateY(-50%) scale(0.9);
	}
}

.add-group-btn {
	height: 80rpx;
	padding: 0 30rpx;
	background: linear-gradient(135deg, #1a94ff 0%, #40B9FE 100%);
	color: #ffffff;
	border: none;
	border-radius: 16rpx;
	font-size: 28rpx;
	font-weight: 500;
	display: flex;
	align-items: center;
	box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.3);
	transition: all 0.3s ease;

	&:active {
		transform: scale(0.98);
	}
}

.action-section {
	margin-bottom: 30rpx;
	text-align: center;
}

.read-btn {
	width: 100%;
	height: 100rpx;
	background: linear-gradient(135deg, #1a94ff 0%, #40B9FE 100%);
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	font-weight: 600;
	color: #ffffff;
	border: none;
	box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.3);
	transition: all 0.3s ease;

	&.disabled {
		background: #cccccc;
		box-shadow: none;
	}

	&.loading {
		background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
	}

	&:active:not(.disabled) {
		transform: scale(0.98);
	}
}

.groups-section {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.group-item {
	background: #f8f9fa;
	border-radius: 16rpx;
	padding: 30rpx;
	border: 2rpx solid transparent;
	transition: all 0.3s ease;

	&.active {
		border-color: #1a94ff;
		background: #f0f2ff;
		box-shadow: 0 4rpx 16rpx rgba(16, 148, 255, 0.2);
	}

	&:hover {
		border-color: #1a94ff;
		background: #f0f2ff;
	}
}

.group-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 30rpx;
	padding-bottom: 20rpx;
	border-bottom: 2rpx solid #e9ecef;
}

.group-info {
	display: flex;
	align-items: center;
	flex: 1;
}

.group-name {
	font-size: 32rpx;
	font-weight: 600;
	color: #333333;
}

.delete-group-btn {
	height: 60rpx;
	padding: 0 20rpx;
	background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
	color: #ffffff;
	border: none;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 16rpx rgba(255, 107, 107, 0.3);
	transition: all 0.3s ease;

	&:active {
		transform: scale(0.9);
	}
}

.data-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 20rpx;
}

.data-item {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.data-label {
	font-size: 24rpx;
	color: #666666;
	font-weight: 500;
}

.data-input {
	height: 80rpx;
	border: 2rpx solid #e9ecef;
	border-radius: 12rpx;
	padding: 0 20rpx;
	font-size: 28rpx;
	background-color: #ffffff;
	transition: all 0.3s ease;

	&:focus {
		border-color: #667eea;
		box-shadow: 0 0 0 4rpx rgba(102, 126, 234, 0.1);
	}
}

.input-grid {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.input-row {
	display: flex;
	margin-top: 20rpx;
	padding: 0 20rpx;
}

.input-item {
	display: flex;
	align-items: center;
	width: 50%;
}

.mr-20 {
	margin-right: 20rpx;
}

.input-label {
	font-size: 24rpx;
	color: #666666;
	margin-right: 10rpx;
}

.input-field {
	height: 60rpx;
	border: 2rpx solid #e9ecef;
	border-radius: 16rpx;
	padding: 0 20rpx;
	font-size: 28rpx;
	background-color: #ffffff;
}

.action-btn {
	height: 60rpx;
	background-color: #007aff;
	color: #ffffff;
	border: none;
	border-radius: 12rpx;
	font-size: 28rpx;
	font-weight: 500;
	margin-bottom: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;

	&.disabled {
		background-color: #cccccc;
		color: #fff;
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
	font-size: 24rpx;
	color: #666666;
	margin-right: 16rpx;
}

.value {
	font-size: 24rpx;
	color: #333333;
	font-weight: 500;

	&.success {
		color: #28a745;
	}
}

.device-info {
	height: 80rpx;
	display: flex;
	align-items: center;
	padding: 16rpx;
	background-color: #f8f9fa;
	border-radius: 8rpx;
}

.device-name {
	font-size: 24rpx;
	color: #666666;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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
	height: 600rpx;
	background-color: #f8f9fa;
	border-radius: 8rpx;
	padding: 0 20rpx;
	margin-top: 20rpx;
	margin-bottom: 20rpx;
}

.bluetooth-device-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-left: 10rpx;
	border-radius: 8rpx;
	height: 80rpx;
	margin: 20rpx 0;
	background-color: #fff;
	overflow: hidden;
}

.bluetooth-name {
	flex: 1;
	font-size: 24rpx;
	color: #666666;
	padding: 20rpx 0;
}

.connect-btn {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 20rpx;
	height: 100%;
	background-color: #007aff;
	color: #ffffff;
	font-size: 24rpx;
}

.add-group {
	display: flex;
}

.input-with-clear {
	position: relative;
	display: flex;
	align-items: center;
}

.input-with-clear .primary-input {
	padding-right: 60rpx;
	/* 为清空按钮留出空间 */
}

.clear-btn {
	position: absolute;
	right: 15rpx;
	top: 50%;
	transform: translateY(-50%);
	width: 30rpx;
	height: 30rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #cccccc;
	color: #ffffff;
	border-radius: 50%;
	font-size: 24rpx;
	font-weight: bold;
	cursor: pointer;
	z-index: 10;

	&:active {
		background-color: #999999;
	}
}

.group-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 20rpx 20rpx;
	margin-bottom: 10rpx;
	border-bottom: 1px solid #eee;


}

.group-name {
	font-size: 24rpx;
}

.del-group {
	margin-left: auto;
}

/* 备注和位置信息样式 */
.note-textarea {
	width: 100%;
	height: 200rpx;
	border: 2rpx solid #e9ecef;
	border-radius: 16rpx;
	padding: 20rpx;
	background-color: #f8f9fa;
	font-size: 28rpx;
	resize: none;
	transition: all 0.3s ease;

	&:focus {
		border-color: #667eea;
		box-shadow: 0 0 0 4rpx rgba(102, 126, 234, 0.1);
		background-color: #ffffff;
	}
}

.info-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 30rpx;
	margin-bottom: 30rpx;
}

.info-item {
	display: flex;
	align-items: center;
	padding: 30rpx;
	background: #f8f9fa;
	border-radius: 16rpx;
	border: 2rpx solid transparent;
	transition: all 0.3s ease;

	&:hover {
		border-color: #667eea;
		background: #f0f2ff;
	}
}


.info-content {
	flex: 1;
}

.info-label {
	font-size: 24rpx;
	color: #666666;
	margin-bottom: 10rpx;
	display: block;
}

.info-value {
	font-size: 28rpx;
	color: #333333;
	font-weight: 500;
}

.error-section {
	display: flex;
	align-items: center;
	padding: 20rpx;
	background: #fff3cd;
	border: 2rpx solid #ffeaa7;
	border-radius: 12rpx;
	margin-bottom: 30rpx;
}


.error-text {
	font-size: 26rpx;
	color: #856404;
	flex: 1;
}

.refresh-btn {
	width: 100%;
	height: 80rpx;
	background: linear-gradient(135deg, #1a94ff 0%, #40B9FE 100%);
	color: #ffffff;
	border: none;
	border-radius: 16rpx;
	font-size: 28rpx;
	font-weight: 500;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 16rpx rgba(16, 148, 255, 0.3);
	transition: all 0.3s ease;

	&:active {
		transform: scale(0.98);
	}
}

/* 校正因子样式 */
.correction-section,
.submit-section {
	margin-bottom: 30rpx;
}

.correction-action,
.submit-action {
	display: flex;
	align-items: center;
	gap: 30rpx;
}

.correction-btn,
.submit-btn {
	height: 80rpx;
	padding: 0 30rpx;
	background: linear-gradient(135deg, #1a94ff 0%, #40B9FE 100%);
	color: #ffffff;
	border: none;
	border-radius: 16rpx;
	font-size: 28rpx;
	font-weight: 500;
	display: flex;
	align-items: center;
	box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.3);
	transition: all 0.3s ease;

	&:active {
		transform: scale(0.98);
	}
}

.correction-result,
.submit-result {
	flex: 1;
	padding: 20rpx;
	background: #f8f9fa;
	border-radius: 12rpx;
	border: 2rpx solid #e9ecef;
}

.result-label {
	font-size: 24rpx;
	color: #666666;
	margin-bottom: 10rpx;
	display: block;
}

.result-value {
	font-size: 32rpx;
	color: #333333;
	font-weight: 600;

	&.success {
		color: #4CAF50;
	}
}

/* 导出数据样式 */
.export-btn {
	width: 100%;
	height: 120rpx;
	background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
	color: #ffffff;
	border: none;
	border-radius: 20rpx;
	font-size: 36rpx;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(255, 107, 107, 0.3);
	transition: all 0.3s ease;

	&:active {
		transform: scale(0.98);
	}
}


/* 响应式布局 */
@media (max-width: 750rpx) {
	.info-grid {
		grid-template-columns: 1fr;
	}

	.data-grid {
		grid-template-columns: 1fr;
	}

	.correction-action,
	.submit-action {
		flex-direction: column;
		align-items: stretch;
	}
}
</style>