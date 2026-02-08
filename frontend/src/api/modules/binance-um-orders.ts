import { RequestWrapper } from '../request';
import { Response } from '../../core/response';

/**
 * 单个交易对操作结果
 */
export interface PositionOperationResult {
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity?: string;
  amount?: number;
  success: boolean;
  orderId?: number;
  error?: string;
}

/**
 * 开仓/平仓操作响应
 */
export interface PositionOperationResponse {
  success: boolean;
  results: PositionOperationResult[];
  processedCount: number;
  totalPositions: number;
  validPositions?: number;
  skippedPositions?: number;
  message: string;
}

/**
 * 订单管理API接口
 */
export class OrdersApi {
  private static readonly BASE_PATH = '/api/v1/orders';

  /**
   * 获取订单模板
   */
  static async getTemplate(): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/`);
  }

  /**
   * U本位合约开仓
   * @param data 开仓参数 { api_key, api_secret, positions: [{ symbol, side, amount }] }
   */
  static async umOpenPosition(data: {
    api_key: string;
    api_secret: string;
    source?: string;
    positions: Array<{
      symbol: string;
      side: 'LONG' | 'SHORT';
      amount: number;
    }>;
  }): Promise<Response<PositionOperationResponse>> {
    return RequestWrapper.post(`${this.BASE_PATH}/um/open-position`, data);
  }

  /**
   * U本位合约平仓
   * @param data 平仓参数 { api_key, api_secret, positions: [{ symbol, side, amount?, quantity?, percentage? }] }
   */
  static async umClosePosition(data: {
    api_key: string;
    api_secret: string;
    source?: string;
    positions: Array<{
      symbol: string;
      side: 'LONG' | 'SHORT';
      amount?: number;
      quantity?: number;
      percentage?: number;
    }>;
  }): Promise<Response<PositionOperationResponse>> {
    return RequestWrapper.post(`${this.BASE_PATH}/um/close-position`, data);
  }

  /**
   * 批量检查
   */
  static async batchInspect(data: {
    api_key: string;
    api_secret: string;
  }): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/batch-inspect`, data);
  }

  /**
   * 设置做空止盈
   */
  static async setShortTakeProfit(data: {
    api_key: string;
    api_secret: string;
    positions: Array<{
      symbol: string;
      stopPrice: number;
      closeRatio: number;
    }>;
  }): Promise<Response<any>> {
    return RequestWrapper.post(`${this.BASE_PATH}/set-short-take-profit`, data);
  }

  /**
   * 查询快捷订单记录
   */
  static async getQuickOrderRecords(params: {
    api_key: string;
    api_secret?: string;
  }): Promise<Response<any>> {
    return RequestWrapper.get(`${this.BASE_PATH}/quick-order/query`, params);
  }

  /**
   * 更新快捷订单折叠状态
   */
  static async updateQuickOrderCollapse(data: {
    api_key: string;
    order_id: number;
    is_collapsed: boolean;
  }): Promise<Response<null>> {
    return RequestWrapper.post(`${this.BASE_PATH}/quick-order/update-collapse`, data);
  }

  /**
   * 删除快捷订单记录
   */
  static async deleteQuickOrderRecord(data: {
    api_key: string;
    order_id: number;
  }): Promise<Response<null>> {
    return RequestWrapper.post(`${this.BASE_PATH}/quick-order/delete`, data);
  }

  /**
   * 获取U本位合约胜率统计
   */
  static async getUmWinRateStats(params: {
    api_key: string;
  }): Promise<Response<WinRateStats>> {
    return RequestWrapper.get(`${this.BASE_PATH}/um/win-rate-stats`, params);
  }

}

/**
 * 快捷订单记录
 */
export interface QuickOrderRecord {
  id: number;
  order_id: string;
  symbol: string;
  side: string;
  position_side: string;
  executed_amount: number;
  executed_price: number;
  quantity: number;
  status: string;
  created_at: string;
  leverage?: number;
  estimated_fee?: number;
  is_collapsed?: boolean;
}

/**
 * 胜率统计数据
 */
export interface WinRateStats {
  today_win_rate: number;
  total_win_rate: number;
}
