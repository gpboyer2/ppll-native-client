import type { BinanceApiKey } from '../../../../stores/binance-store'

export type ApiKey = BinanceApiKey

export interface ApiKeySelectorProps {
  api_key_list: ApiKey[]
  active_api_key_id: string | null
  on_key_select: (id: string) => void
}

export function ApiKeySelector(props: ApiKeySelectorProps): JSX.Element | null {
  const { api_key_list, active_api_key_id, on_key_select } = props

  if (api_key_list.length === 0) {
    return null
  }

  return (
    <div className="quick-order-api-key-selector">
      <span className="quick-order-api-key-label">API Key：</span>
      <div className="quick-order-api-key-buttons">
        {api_key_list.map((api_key) => (
          <button
            key={api_key.id}
            className={`quick-order-api-key-button ${active_api_key_id === String(api_key.id) ? 'active' : ''}`}
            onClick={() => on_key_select(String(api_key.id))}
          >
            {api_key.name}
          </button>
        ))}
      </div>
    </div>
  )
}
