// 币安合约交易接口使用示例

import { ApiEndpoints, BinanceApi } from '../api'
import { BinanceCredentials, PositionConfig } from '../types/binance'

/**
 * 币安合约交易接口使用示例
 */
export class BinanceUsageExample {

  /**
   * 示例：获取账户信息
   */
  static async getUmAccountInfoExample() {
    const apiKey = 'your_binance_api_key'
    const apiSecret = 'your_binance_api_secret'

    try {
      // 方式1：通过ApiEndpoints调用
      const response = await BinanceApi.getUmAccountInfo(apiKey, apiSecret)

      if (response.code === 0 && response.data) {
        const accountData = response.data
        if (accountData.status === 'success') {
          console.log('账户信息获取成功:', accountData.data)
          return accountData.data
        } else {
          console.error('获取账户信息失败:', accountData.message)
        }
      } else {
        console.error('请求失败:', response.msg)
      }
    } catch (error) {
      console.error('网络请求异常:', error)
    }
  }

  /**
   * 示例：自定义建仓
   */
  static async customBuildPositionExample() {
    const credentials: BinanceCredentials = {
      apiKey: 'your_binance_api_key',
      apiSecret: 'your_binance_api_secret'
    }

    const positions: PositionConfig[] = [
      {
        symbol: 'BTCUSDT',
        longAmount: 100,
        shortAmount: 100
      },
      {
        symbol: 'ETHUSDT',
        longAmount: 50,
        shortAmount: 50
      }
    ]

    try {
      // 验证配置
      if (!BinanceApi.validateCredentials(credentials.apiKey, credentials.apiSecret)) {
        console.error('API凭证无效')
        return
      }

      if (!BinanceApi.validatePositionConfigs(positions)) {
        console.error('建仓配置无效')
        return
      }

      // 方式2：直接通过BinanceApi调用
      const response = await BinanceApi.customBuildPosition({
        ...credentials,
        positions
      })

      if (response.code === 0 && response.data) {
        const result = response.data
        if (result.status === 'success') {
          console.log('建仓操作成功:', result.data)
          console.log(`处理了 ${result.data?.processedCount}/${result.data?.totalPositions} 个交易对`)
        } else {
          console.error('建仓操作失败:', result.message)
        }
      } else {
        console.error('请求失败:', response.msg)
      }
    } catch (error) {
      console.error('建仓操作异常:', error)
    }
  }

  /**
   * 示例：批量平仓
   */
  static async batchClosePositionExample() {
    const apiKey = 'your_binance_api_key'
    const apiSecret = 'your_binance_api_secret'

    // 要平仓的交易对列表
    const positions = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT']

    try {
      // 格式化交易对列表
      const formattedPositions = BinanceApi.formatTradingPairs(positions)
      console.log('格式化后的交易对:', formattedPositions)

      const response = await BinanceApi.batchClosePosition(apiKey, apiSecret, formattedPositions)

      if (response.code === 0 && response.data) {
        const result = response.data
        if (result.status === 'success') {
          console.log('平仓操作已开始:', result.data?.message)
          console.log('请等待约 15 秒后，在APP查看平仓结果')
        } else {
          console.error('平仓操作失败:', result.message)
        }
      } else {
        console.error('请求失败:', response.msg)
      }
    } catch (error) {
      console.error('平仓操作异常:', error)
    }
  }

  /**
   * 示例：完整的交易流程
   */
  static async fullTradingFlowExample() {
    const credentials = BinanceApi.buildCredentials(
      'your_binance_api_key',
      'your_binance_api_secret'
    )

    console.log('=== 开始完整交易流程 ===')

    // 1. 获取账户信息
    console.log('1. 获取账户信息...')
    await this.getUmAccountInfoExample()

    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 2. 执行建仓操作
    console.log('2. 执行建仓操作...')
    await this.customBuildPositionExample()

    // 等待建仓完成
    console.log('等待建仓完成...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // 3. 再次获取账户信息查看变化
    console.log('3. 查看建仓后的账户信息...')
    await this.getUmAccountInfoExample()

    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 10000))

    // 4. 执行平仓操作
    console.log('4. 执行平仓操作...')
    await this.batchClosePositionExample()

    console.log('=== 交易流程完成 ===')
  }

  /**
   * 错误处理示例
   */
  static async errorHandlingExample() {
    try {
      // 使用无效的API凭证
      const response = await BinanceApi.getUmAccountInfo('invalid_key', 'invalid_secret')

      if (response.code !== 0) {
        console.log('预期的错误响应:', response.msg)
      }

      if (response.data && response.data.status === 'error') {
        console.log('币安API错误:', response.data.message)
        console.log('错误代码:', response.data.code)
      }
    } catch (error) {
      console.error('捕获到异常:', error)
    }
  }
}

// 导出便捷方法
export const {
  getUmAccountInfoExample,
  customBuildPositionExample,
  batchClosePositionExample,
  fullTradingFlowExample,
  errorHandlingExample
} = BinanceUsageExample
