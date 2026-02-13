import { useState } from 'react'
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react'
import { Button, ConfirmModal } from '../../../../components/mantine'

export interface BalanceButtonProps {
  trading_pair: string
  on_balance_by_open_click: () => void
  on_balance_by_close_click: () => void
}

export function BalanceButton(props: BalanceButtonProps): JSX.Element {
  const { trading_pair, on_balance_by_open_click, on_balance_by_close_click } = props

  const [showOpenConfirm, setShowOpenConfirm] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const handleOpenConfirm = () => {
    setShowOpenConfirm(false)
    on_balance_by_open_click()
  }

  const handleCloseConfirm = () => {
    setShowCloseConfirm(false)
    on_balance_by_close_click()
  }

  return (
    <>
      <div className="quick-order-balance">
        <div className="quick-order-balance-buttons-group">
          <Button
            className="quick-order-balance-btn quick-order-balance-btn-open"
            onClick={() => setShowOpenConfirm(true)}
            title={`通过建仓方式使 ${trading_pair} 多空仓位相等`}
          >
            <IconArrowUp size={16} />
            <span>开仓持平 (通过建仓方式使 ${trading_pair} 多空仓位相等)</span>
          </Button>
          <div className="quick-order-balance-divider" />
          <Button
            className="quick-order-balance-btn quick-order-balance-btn-close"
            onClick={() => setShowCloseConfirm(true)}
            title={`通过减仓方式使 ${trading_pair} 多空仓位相等`}
          >
            <IconArrowDown size={16} />
            <span>平仓持平 (通过减仓方式使 ${trading_pair} 多空仓位相等)</span>
          </Button>
        </div>
      </div>
      <ConfirmModal
        opened={showOpenConfirm}
        onClose={() => setShowOpenConfirm(false)}
        onConfirm={handleOpenConfirm}
        title="确认开仓持平"
        content={`通过建仓方式使 ${trading_pair} 多空仓位相等，是否继续？`}
        confirmText="确认"
        cancelText="取消"
      />
      <ConfirmModal
        opened={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={handleCloseConfirm}
        title="确认平仓持平"
        content={`通过减仓方式使 ${trading_pair} 多空仓位相等，是否继续？`}
        confirmText="确认"
        cancelText="取消"
      />
    </>
  )
}
