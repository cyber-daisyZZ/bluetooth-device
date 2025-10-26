import bluetoothConfig, {
	DataValidator
} from "@/config/bluetooth.js";

// 蓝牙工具类
class BluetoothManager {
	reset() {
		this.isConnected = false;
		this.device = null;
		this.promise = null;
		this.deviceId = "";
		this.deviceName = "";
		this.gatt = null;
		this.services = [];
		this.characteristics = [];
		this.reconnectAttempts = 0;
	}
	setDevice(device, promise) {
		this.isConnected = true;
		this.device = device;
		this.promise = promise;
		this.deviceId = device.id;
		this.deviceName = device.name;
		this.gatt = device.gatt;
		this.reconnectAttempts = 0;
	}
	constructor() {
		this.reset();
		this.reconnectTimer = null;
	}

	// 检查蓝牙是否可用
	checkBluetoothAvailable() {
		return new Promise((resolve, reject) => {
			// #ifdef APP-PLUS
			uni.getSystemInfo({
				success: (res) => {
					if (res.platform === "android" || res.platform === "ios") {
						// 检查蓝牙权限
						this.checkBluetoothPermission()
							.then(() => {
								resolve(true);
							})
							.catch((error) => {
								reject(error);
							});
					} else {
						reject(new Error("不支持的平台"));
					}
				},
				fail: (error) => {
					reject(error);
				},
			});
			// #endif

			// #ifdef H5
			if (navigator.bluetooth) {
				resolve(true);
			} else {
				reject(new Error("浏览器不支持蓝牙"));
			}
			// #endif
		});
	}

	// 检查蓝牙权限
	checkBluetoothPermission() {
		return new Promise((resolve, reject) => {
			// #ifdef APP-PLUS
			// Android 权限检查
			if (uni.getSystemInfoSync().platform === "android") {
				resolve();
			} else {
				resolve();
			}
			// #endif

			// #ifdef H5
			resolve();
			// #endif
		});
	}

	// 扫描蓝牙设备
	scanDevices(cb, handlePromise) {
		return new Promise((resolve, reject) => {
			// #ifdef APP-PLUS
			uni.openBluetoothAdapter({
				success: () => {
					uni.startBluetoothDevicesDiscovery({
						success: () => {
							handlePromise(resolve, reject)
							uni.onBluetoothDeviceFound((res) => {
								cb(res.devices);
							});
						},
						fail: (error) => {
							reject(error);
						},
					});
				},
				fail: (error) => {
					console.error("初始化蓝牙失败", error);
					// 提示用户开启蓝牙权限
					uni.showModal({
						title: "提示",
						content: "请先开启蓝牙",
						showCancel: false,
					});
					reject(error);
				},
			});
			// #endif

			// #ifdef H5
			// if (navigator.bluetooth) {
			//   navigator.bluetooth
			//     .requestDevice({
			//       acceptAllDevices: true,
			//       optionalServices: ["generic_access"],
			//     })
			//     .then((device) => {
			//       console.log(device);
			//       resolve([
			//         {
			//           gatt: device.gatt,
			//           deviceId: device.id,
			//           name: device.name || "未知设备",
			//           rssi: 0,
			//         },
			//       ]);
			//     })
			//     .catch((error) => {
			//       reject(error);
			//     });
			// } else {
			reject(new Error("浏览器不支持蓝牙"));
			// }
			// #endif
		});
	}

	// 连接蓝牙设备
	connectDevice(device) {
		return new Promise((resolve, reject) => {
			// #ifdef APP-PLUS
			uni.createBLEConnection({
				deviceId: device.deviceId,
				success(res) {
					console.log(res);
					resolve({
						success: true,
						deviceId: device.deviceId,
						name: device.name,
					});
				},
				fail(err) {
					console.error(err);
					reject(err);
				},
			});
			// #endif

			// #ifdef H5
			device.gatt
				.connect()
				.then(({
					device,
					gatt_
				}) => {
					this.setDevice({
						device,
					});
					resolve({
						success: true,
						deviceId: device.id,
						deviceName: device.name,
					});
				})
				.catch((error) => {
					reject(error);
				});
			// #endif
		});
	}

	// 断开蓝牙连接
	disconnectDevice() {
		return new Promise((resolve) => {
			// #ifdef APP-PLUS
			setTimeout(() => {
				this.reset();

				if (this.reconnectTimer) {
					clearTimeout(this.reconnectTimer);
					this.reconnectTimer = null;
				}

				resolve();
			}, 500);
			// #endif

			// #ifdef H5
			this.device.disconnect();
			this.reset();
			resolve();
			// #endif
		});
	}

	// 读取数据
	readData() {
		return new Promise((resolve, reject) => {
			if (!this.isConnected) {
				reject(new Error("设备未连接"));
				return;
			}

			// #ifdef APP-PLUS
			// 模拟读取数据
			setTimeout(() => {
				// 生成模拟数据
				const mockData = {
					concentration: Math.floor(Math.random() * 100) + 50,
					temperature: (Math.random() * 20 + 20).toFixed(1),
					humidity: (Math.random() * 30 + 40).toFixed(1),
					timestamp: new Date().getTime(),
				};

				// 验证数据
				if (DataValidator.validateDataPacket(mockData)) {
					resolve(mockData);
				} else {
					reject(new Error("数据验证失败"));
				}
			}, 1000);
			// #endif

			// #ifdef H5
			this.gatt
				.readValue({
					service: bluetoothConfig.serviceUUID,
					characteristic: bluetoothConfig.characteristicUUID,
				})
				.then((value) => {
					console.log("读取数据:", value);
					resolve(value);
				});
			// #endif
		});
	}

	// 写入数据
	writeData(data) {
		return new Promise((resolve, reject) => {
			if (!this.isConnected) {
				reject(new Error("设备未连接"));
				return;
			}

			// #ifdef APP-PLUS
			// 模拟写入数据
			setTimeout(() => {
				console.log("写入数据:", data);
				resolve({
					success: true,
				});
			}, 500);
			// #endif

			// #ifdef H5
			reject(new Error("H5环境不支持蓝牙数据写入"));
			// #endif
		});
	}

	// 发送命令
	sendCommand(commandType) {
		return new Promise((resolve, reject) => {
			if (!this.isConnected) {
				reject(new Error("设备未连接"));
				return;
			}

			const command = bluetoothConfig.commands[commandType];
			if (!command) {
				reject(new Error("未知命令类型"));
				return;
			}

			// #ifdef APP-PLUS
			// 模拟发送命令
			setTimeout(() => {
				console.log("发送命令:", commandType, command);
				resolve({
					success: true,
				});
			}, 500);
			// #endif

			// #ifdef H5
			reject(new Error("H5环境不支持蓝牙命令发送"));
			// #endif
		});
	}

	// 获取连接状态
	getConnectionStatus() {
		return {
			isConnected: this.isConnected,
			deviceId: this.deviceId,
			deviceName: this.deviceName,
		};
	}

	// 自动重连
	async reconnect() {
		if (this.reconnectAttempts >= bluetoothConfig.maxReconnectAttempts) {
			console.log("重连次数已达上限");
			return false;
		}

		this.reconnectAttempts++;
		console.log(
			`尝试重连 (${this.reconnectAttempts}/${bluetoothConfig.maxReconnectAttempts})`
		);

		try {
			await this.connectDevice(this.deviceId);
			console.log("重连成功");
			return true;
		} catch (error) {
			console.log("重连失败:", error);

			// 设置下次重连
			this.reconnectTimer = setTimeout(() => {
				this.reconnect();
			}, bluetoothConfig.reconnectInterval);

			return false;
		}
	}
}

// 创建单例实例
const bluetoothManager = new BluetoothManager();

export default bluetoothManager;