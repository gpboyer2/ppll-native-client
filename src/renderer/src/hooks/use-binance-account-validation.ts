import { useState, useCallback } from 'react'
import { BinanceAccountApi } from '../api'

type ErrorType =
  | 'validation_failed'
  | 'vip_required'
  | 'network_error'
  | 'signature_error'
  | 'invalid_api_key'
  | 'ip_restricted'

interface AccountValidationData {
  feeTier?: number
  canTrade?: boolean
  canDeposit?: boolean
  canWithdraw?: boolean
  totalInitialMargin?: string
  totalMaintMargin?: string
  totalWalletBalance?: string
  totalUnrealizedProfit?: string
  totalMarginBalance?: string
  totalPositionInitialMargin?: string
  totalOpenOrderInitialMargin?: string
  totalCrossWalletBalance?: string
  totalCrossUnPnl?: string
  availableBalance?: string
  maxWithdrawAmount?: string
  assets?: any[]
  positions?: any[]
}

interface ValidationResult {
  status: 'idle' | 'loading' | 'success' | 'error'
  data?: AccountValidationData
  error?: string
  errorType?: ErrorType
  ipAddress?: string
}

interface UseBinanceAccountValidationOptions {
  api_key: string
  api_secret: string
}

const EMPTY_RESULT: ValidationResult = { status: 'idle' }

export function useBinanceAccountValidation() {
  const [result, setResult] = useState<ValidationResult>(EMPTY_RESULT)

  const validate = useCallback(async (options: UseBinanceAccountValidationOptions) => {
    setResult({ status: 'loading' })

    try {
      const response = await BinanceAccountApi.getUSDMFutures({
        api_key: options.api_key,
        api_secret: options.api_secret,
        include_positions: true
      })

      if (response.status === 'success' && response.datum) {
        setResult({ status: 'success', data: response.datum })
        return { status: 'success' as const, data: response.datum }
      } else {
        let error_message =
          response.datum && typeof response.datum === 'string'
            ? response.datum
            : response.message || '获取账户信息失败'

        let error_type: ErrorType = 'validation_failed'
        let ip_address: string | undefined = undefined

        if (response.datum && typeof response.datum === 'object' && response.datum.ip_address) {
          ip_address = response.datum.ip_address
        } else {
          const ip_match = error_message.match(/request ip:\s*([\d.]+)/)
          if (ip_match && ip_match[1]) {
            ip_address = ip_match[1]
          }
        }

        if (error_message.includes('您不是 VIP 用户') || error_message.includes('VIP 已过期')) {
          error_type = 'vip_required'
          error_message = '您不是 VIP 用户，无法使用该功能'
        } else if (
          error_message.includes('Signature for this request is not valid') ||
          error_message.includes('签名错误')
        ) {
          error_type = 'signature_error'
          error_message = '签名错误'
        } else if (
          error_message.includes('IP 白名单限制') ||
          error_message.includes('IP, or permissions')
        ) {
          error_type = 'ip_restricted'
          error_message = 'IP 白名单限制'
        } else if (error_message.includes('Invalid API-key') || error_message.includes('API-key')) {
          error_type = 'invalid_api_key'
          error_message = 'API Key 无效'
        }

        setResult({
          status: 'error',
          error: error_message,
          errorType: error_type,
          ipAddress: ip_address
        })
        return {
          status: 'error' as const,
          error: error_message,
          errorType: error_type,
          ipAddress: ip_address
        }
      }
    } catch (error: any) {
      let error_message = error.message || 'API Key 验证失败，请检查配置'
      let error_type: ErrorType = 'validation_failed'
      let ip_address = undefined

      const ip_match = error_message.match(/request ip:\s*([\d.]+)/)
      if (ip_match && ip_match[1]) {
        ip_address = ip_match[1]
      }

      if (error_message.includes('您不是 VIP 用户') || error_message.includes('VIP 已过期')) {
        error_type = 'vip_required'
        error_message = '您不是 VIP 用户，无法使用该功能'
      } else if (
        error_message.includes('Signature for this request is not valid') ||
        error_message.includes('签名错误')
      ) {
        error_type = 'signature_error'
        error_message = '签名错误'
      } else if (
        error_message.includes('IP 白名单限制') ||
        error_message.includes('IP, or permissions')
      ) {
        error_type = 'ip_restricted'
        error_message = 'IP 白名单限制'
      } else if (error_message.includes('Invalid API-key') || error_message.includes('API-key')) {
        error_type = 'invalid_api_key'
        error_message = 'API Key 无效'
      } else if (
        error_message.includes('网络') ||
        error_message.includes('Network') ||
        error_message.includes('ETIMEDOUT')
      ) {
        error_type = 'network_error'
        error_message = '网络连接失败'
      }

      setResult({
        status: 'error',
        error: error_message,
        errorType: error_type,
        ipAddress: ip_address
      })
      return {
        status: 'error' as const,
        error: error_message,
        errorType: error_type,
        ipAddress: ip_address
      }
    }
  }, [])

  const reset = useCallback(() => {
    setResult(EMPTY_RESULT)
  }, [])

  return {
    result,
    validate,
    reset
  }
}

export type {
  AccountValidationData,
  ValidationResult,
  ErrorType,
  UseBinanceAccountValidationOptions
}
