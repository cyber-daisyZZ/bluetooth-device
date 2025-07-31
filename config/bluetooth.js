// 蓝牙设备配置
export const bluetoothConfig = {
  // 设备服务UUID（根据实际设备调整）
  serviceUUID: "0000ffe0-0000-1000-8000-00805f9b34fb",

  // 特征值UUID（根据实际设备调整）
  characteristicUUID: "0000ffe1-0000-1000-8000-00805f9b34fb",

  // 设备名称前缀（用于识别目标设备）
  deviceNamePrefix: ["蓝牙传感器", "BLE_Sensor", "Concentration"],

  // 连接超时时间（毫秒）
  connectionTimeout: 10000,

  // 读取超时时间（毫秒）
  readTimeout: 5000,

  // 写入超时时间（毫秒）
  writeTimeout: 3000,

  // 重连次数
  maxReconnectAttempts: 3,

  // 重连间隔（毫秒）
  reconnectInterval: 2000,

  // 数据格式配置
  dataFormat: {
    // 浓度数据长度（字节）
    concentrationLength: 4,

    // 温度数据长度（字节）
    temperatureLength: 2,

    // 湿度数据长度（字节）
    humidityLength: 2,

    // 数据包起始标识
    startByte: 0xaa,

    // 数据包结束标识
    endByte: 0x55,
  },

  // 命令配置
  commands: {
    // 读取浓度数据
    readConcentration: [0x01, 0x03, 0x00, 0x00, 0x00, 0x01, 0x84, 0x0a],

    // 读取温度数据
    readTemperature: [0x01, 0x03, 0x00, 0x01, 0x00, 0x01, 0xd5, 0xca],

    // 读取湿度数据
    readHumidity: [0x01, 0x03, 0x00, 0x02, 0x00, 0x01, 0x25, 0xcb],

    // 校准命令
    calibrate: [0x01, 0x06, 0x00, 0x03, 0x00, 0x01, 0xe8, 0x0a],

    // 重置设备
    reset: [0x01, 0x06, 0x00, 0x04, 0x00, 0x00, 0x89, 0xcb],
  },
};

// 数据解析器
export class DataParser {
  // 解析浓度数据
  static parseConcentration(data) {
    if (!data || data.length < 4) {
      return null;
    }

    // 假设数据格式为：起始字节 + 浓度值（2字节）+ 校验字节
    const startByte = data[0];
    const concentration = (data[1] << 8) | data[2];
    const checksum = data[3];

    // 简单的校验
    const calculatedChecksum = (startByte + data[1] + data[2]) & 0xff;

    if (calculatedChecksum === checksum) {
      return concentration;
    }

    return null;
  }

  // 解析温度数据
  static parseTemperature(data) {
    if (!data || data.length < 2) {
      return null;
    }

    // 假设温度数据为16位有符号整数，单位为0.1°C
    const tempRaw = (data[0] << 8) | data[1];
    const temperature = tempRaw / 10.0;

    return temperature;
  }

  // 解析湿度数据
  static parseHumidity(data) {
    if (!data || data.length < 2) {
      return null;
    }

    // 假设湿度数据为16位无符号整数，单位为0.1%RH
    const humidityRaw = (data[0] << 8) | data[1];
    const humidity = humidityRaw / 10.0;

    return humidity;
  }

  // 解析完整数据包
  static parseDataPacket(data) {
    if (!data || data.length < 8) {
      return null;
    }

    const startByte = data[0];
    const endByte = data[data.length - 1];

    if (
      startByte !== bluetoothConfig.dataFormat.startByte ||
      endByte !== bluetoothConfig.dataFormat.endByte
    ) {
      return null;
    }

    const concentration = this.parseConcentration(data.slice(1, 5));
    const temperature = this.parseTemperature(data.slice(5, 7));
    const humidity = this.parseHumidity(data.slice(7, 9));

    return {
      concentration,
      temperature,
      humidity,
      timestamp: new Date().getTime(),
    };
  }
}

// 数据校验器
export class DataValidator {
  // 验证浓度值是否在合理范围内
  static validateConcentration(value) {
    return value >= 0 && value <= 1000;
  }

  // 验证温度值是否在合理范围内
  static validateTemperature(value) {
    return value >= -40 && value <= 80;
  }

  // 验证湿度值是否在合理范围内
  static validateHumidity(value) {
    return value >= 0 && value <= 100;
  }

  // 验证数据包
  static validateDataPacket(data) {
    if (!data) return false;

    return (
      this.validateConcentration(data.concentration) &&
      this.validateTemperature(data.temperature) &&
      this.validateHumidity(data.humidity)
    );
  }
}

export default bluetoothConfig;
