import { RequestWrapper } from './request';
import { Response } from '../core/response';
import {
  BinanceApiResponse,
  AccountInfoRequest,
  AccountInfo,
  UmOpenPositionRequest,
  UmClosePositionRequest,
  PositionOperationResponse
} from '../types/binance';

/**
 * 币安合约交易API接口
 * 服务器地址: http://156.245.200.31:7002
 */
export class BinanceApi {
  // 服务器基础URL
  private static readonly BASE_URL = 'http://156.245.200.31:7002';

  // ==================== 账户相关 ====================

  /**
   * 获取币安U本位合约账户详细信息
   * @param request 包含API密钥的请求参数
   * @returns 账户详细信息
   */
  static async getUmAccountInfo(request: AccountInfoRequest): Promise<Response<BinanceApiResponse<AccountInfo>>> {
    return RequestWrapper.post<BinanceApiResponse<AccountInfo>>(
      `${this.BASE_URL}/api/v1/dashboard/account`,
      request
    );
  }

  // ==================== 订单相关 ====================

  /**
   * U本位合约开仓
   * 根据指定的交易对列表进行开仓操作
   * 支持指定具体的交易对和多空方向，适用于精确的建仓需求
   *
   * @param request 开仓请求参数
   * @returns 开仓操作结果
   */
  static async umOpenPosition(request: UmOpenPositionRequest): Promise<Response<PositionOperationResponse>> {
    return RequestWrapper.post<PositionOperationResponse>(
      `${this.BASE_URL}/api/v1/orders/um/open-position`,
      request
    );
  }

  /**
   * U本位合约平仓
   * 一键平仓功能，对所有指定交易对进行平仓操作
   * 支持按金额、数量或百分比平仓
   *
   * @param request 平仓请求参数
   * @returns 平仓操作结果
   */
  static async umClosePosition(request: UmClosePositionRequest): Promise<Response<PositionOperationResponse>> {
    return RequestWrapper.post<PositionOperationResponse>(
      `${this.BASE_URL}/api/v1/orders/um/close-position`,
      request
    );
  }

  // ==================== 工具方法 ====================

  /**
   * 验证API凭证格式
   * @param api_key API密钥
   * @param api_secret API密钥Secret
   * @returns 是否有效
   */
  static validateCredentials(api_key: string, api_secret: string): boolean {
    return !!(api_key && api_key.trim() && api_secret && api_secret.trim());
  }

  /**
   * 构建API凭证对象
   * @param api_key API密钥
   * @param api_secret API密钥Secret
   * @returns API凭证对象
   */
  static buildCredentials(api_key: string, api_secret: string) {
    return {
      api_key: api_key.trim(),
      api_secret: api_secret.trim()
    };
  }

  /**
   * 格式化交易对列表
   * 确保交易对格式正确，过滤无效项
   * @param symbols 交易对列表
   * @returns 格式化后的交易对列表
   */
  static formatTradingPairs(symbols: string[]): string[] {
    return symbols
      .filter(symbol => symbol && symbol.trim())
      .map(symbol => symbol.trim().toUpperCase())
      .filter(symbol => symbol.endsWith('USDT')); // 只保留USDT交易对
  }

  /**
   * 验证建仓配置
   * @param positions 建仓配置列表
   * @returns 是否有效
   */
  static validatePositionConfigs(positions: Array<{ symbol: string; long_amount: number; short_amount: number }>): boolean {
    if (!positions || positions.length === 0) {
      return false;
    }

    return positions.every(pos =>
      pos.symbol &&
      pos.symbol.trim() &&
      typeof pos.long_amount === 'number' &&
      pos.long_amount > 0 &&
      typeof pos.short_amount === 'number' &&
      pos.short_amount > 0
    );
  }
}
