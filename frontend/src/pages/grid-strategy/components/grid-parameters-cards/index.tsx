import { NumberInput } from '../../../../components/mantine';
import type { GridStrategyForm } from '../../../../types/grid-strategy';
import { emptyToUndefined } from '../../../../utils';
import './index.scss';


interface GridParametersCardsProps {
  formData: GridStrategyForm;
  updateFormField: <K extends keyof GridStrategyForm>(key: K, value: GridStrategyForm[K]) => void;
  isLongOnlyField: () => boolean;
  isShortOnlyField: () => boolean;
  renderValidationHint: (field_name: string) => JSX.Element | null;
}

/**
 * 网格策略参数卡片组件
 * 包含网格参数、风险控制、高级选项三个 Card
 */
export function GridParametersCards({
  formData,
  updateFormField,
  isLongOnlyField,
  isShortOnlyField,
  renderValidationHint
}: GridParametersCardsProps) {
  return (
    <>
      {/* 网格参数 */}
      <div className="grid-strategy-form-section">
        <h2 className="grid-strategy-form-section-title">
          <span className="grid-strategy-form-section-icon">📊</span>
          网格参数
        </h2>

        <div className="grid-strategy-form-grid">
          {/* 网格价格差价 */}
          <div className="grid-strategy-form-field">
            <label className="grid-strategy-form-label">
              网格价格差价
              <span className="grid-strategy-form-required">*</span>
            </label>
            <NumberInput
              value={emptyToUndefined(formData.grid_price_difference)}
              onChange={(value) => updateFormField('grid_price_difference', (typeof value === 'number' ? value : parseFloat(value || '0')))}
              decimalScale={2}
              min={0.01}
              step={0.01}
              placeholder="例如：10"
              required
            />
            <div className="help">每个网格之间的价格间隔，如10表示每个网格间隔10 USDT</div>
            {renderValidationHint('grid_price_difference')}
          </div>

          {/* 做多开仓数量 */}
          <div className={`grid-strategy-form-field ${isLongOnlyField() ? '' : 'grid-strategy-field-hidden'}`}>
            <label className="grid-strategy-form-label">做多开仓数量</label>
            <NumberInput
              value={emptyToUndefined(formData.grid_long_open_quantity)}
              onChange={(value) => updateFormField('grid_long_open_quantity', (typeof value === 'number' ? value : parseFloat(value || '0')))}
              decimalScale={3}
              min={0.001}
              step={0.001}
              placeholder="例如：0.1"
            />
            <div className="help">做多方向：每次增加多单持仓的数量</div>
            {renderValidationHint('grid_long_open_quantity')}
          </div>

          {/* 做多平仓数量 */}
          <div className={`grid-strategy-form-field ${isLongOnlyField() ? '' : 'grid-strategy-field-hidden'}`}>
            <label className="grid-strategy-form-label">做多平仓数量</label>
            <NumberInput
              value={emptyToUndefined(formData.grid_long_close_quantity)}
              onChange={(value) => updateFormField('grid_long_close_quantity', (typeof value === 'number' ? value : parseFloat(value || '0')))}
              decimalScale={3}
              min={0.001}
              step={0.001}
              placeholder="例如：0.1"
            />
            <div className="help">做多方向：每次减少多单持仓的数量</div>
            {renderValidationHint('grid_long_close_quantity')}
          </div>

          {/* 做空开仓数量 */}
          <div className={`grid-strategy-form-field ${isShortOnlyField() ? '' : 'grid-strategy-field-hidden'}`}>
            <label className="grid-strategy-form-label">做空开仓数量</label>
            <NumberInput
              value={emptyToUndefined(formData.grid_short_open_quantity)}
              onChange={(value) => updateFormField('grid_short_open_quantity', (typeof value === 'number' ? value : parseFloat(value || '0')))}
              decimalScale={3}
              min={0.001}
              step={0.001}
              placeholder="例如：0.1"
            />
            <div className="help">做空方向：每次增加空单持仓的数量（开空单）</div>
            {renderValidationHint('grid_short_open_quantity')}
          </div>

          {/* 做空平仓数量 */}
          <div className={`grid-strategy-form-field ${isShortOnlyField() ? '' : 'grid-strategy-field-hidden'}`}>
            <label className="grid-strategy-form-label">做空平仓数量</label>
            <NumberInput
              value={emptyToUndefined(formData.grid_short_close_quantity)}
              onChange={(value) => updateFormField('grid_short_close_quantity', (typeof value === 'number' ? value : parseFloat(value || '0')))}
              decimalScale={3}
              min={0.001}
              step={0.001}
              placeholder="例如：0.1"
            />
            <div className="help">做空方向：每次减少空单持仓的数量（平空单）</div>
            {renderValidationHint('grid_short_close_quantity')}
          </div>
        </div>
      </div>

      {/* 风险控制 */}
      <div className="grid-strategy-form-section">
        <h2 className="grid-strategy-form-section-title">
          <span className="grid-strategy-form-section-icon">🛡️</span>
          风险控制
        </h2>

        <div className="grid-strategy-form-grid">
          {/* 最大持仓数量 */}
          <div className="grid-strategy-form-field">
            <label className="grid-strategy-form-label">最大持仓数量</label>
            <NumberInput
              value={emptyToUndefined(formData.max_open_position_quantity)}
              onChange={(value) => updateFormField('max_open_position_quantity', (typeof value === 'number' ? value : parseFloat(value || '0')))}
              decimalScale={3}
              min={0}
              step={0.001}
              placeholder="例如：1"
            />
            <div className="help">限制的最大的持仓数量，为空则不限制，如1个ETH</div>
          </div>

          {/* 最小持仓数量 */}
          <div className="grid-strategy-form-field">
            <label className="grid-strategy-form-label">最小持仓数量</label>
            <NumberInput
              value={emptyToUndefined(formData.min_open_position_quantity)}
              onChange={(value) => updateFormField('min_open_position_quantity', (typeof value === 'number' ? value : parseFloat(value || '0')))}
              decimalScale={3}
              min={0}
              step={0.001}
              placeholder="例如：0.2"
            />
            <div className="help">限制的最少的持仓数量，为空则不限制，如0.2个ETH</div>
          </div>

          {/* 防跌/防涨系数 */}
          <div className="grid-strategy-form-field">
            <label className="grid-strategy-form-label">防跌/防涨系数</label>
            <NumberInput
              value={formData.fall_prevention_coefficient}
              onChange={(value) => updateFormField('fall_prevention_coefficient', (typeof value === 'number' ? value : parseFloat(value || '0')))}
              decimalScale={2}
              min={0}
              step={0.01}
              placeholder="0"
            />
            <div className="help">系数越大，价格变动时的触发价格会下放得更低，为0时固定使用网格差价</div>
          </div>
        </div>

        {/* 价格边界限制分组 */}
        <div className="grid-strategy-risk-subsection">
          <h3 className="grid-strategy-risk-subsection-title">价格边界限制</h3>
          <p className="grid-strategy-risk-subsection-desc">设置具体的绝对价格值作为网格运行的上限和下限</p>
          <div className="grid-strategy-form-grid">
            {/* 价格上限 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">价格上限</label>
              <NumberInput
                value={emptyToUndefined(formData.gt_limitation_price)}
                onChange={(value) => updateFormField('gt_limitation_price', (typeof value === 'number' ? value : parseFloat(value || '0')))}
                decimalScale={2}
                min={0}
                step={0.01}
                placeholder="例如：3000"
              />
              <div className="help">大于等于此价格时暂停网格，为空则不限制</div>
            </div>

            {/* 价格下限 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">价格下限</label>
              <NumberInput
                value={emptyToUndefined(formData.lt_limitation_price)}
                onChange={(value) => updateFormField('lt_limitation_price', (typeof value === 'number' ? value : parseFloat(value || '0')))}
                decimalScale={2}
                min={0}
                step={0.01}
                placeholder="例如：2000"
              />
              <div className="help">小于等于此价格时暂停网格，为空则不限制</div>
            </div>
          </div>
        </div>

        {/* 持仓均价限制分组 */}
        <div className="grid-strategy-risk-subsection">
          <h3 className="grid-strategy-risk-subsection-title">持仓均价限制</h3>
          <p className="grid-strategy-risk-subsection-desc">以持仓均价为基准，根据价格相对位置决定是否暂停</p>
          <div className="grid-strategy-form-toggles">
            <div className="grid-strategy-form-toggle">
              <div className="grid-strategy-form-toggle-info">
                <label className="grid-strategy-form-label">高于持仓均价时暂停</label>
                <div className="help">当价格大于等于持仓均价时则暂停网格</div>
              </div>
              <label className="grid-strategy-toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.is_above_open_price}
                  onChange={e => updateFormField('is_above_open_price', e.target.checked)}
                />
                <span></span>
              </label>
            </div>

            <div className="grid-strategy-form-toggle">
              <div className="grid-strategy-form-toggle-info">
                <label className="grid-strategy-form-label">低于持仓均价时暂停</label>
                <div className="help">当价格小于等于持仓均价时则暂停网格</div>
              </div>
              <label className="grid-strategy-toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.is_below_open_price}
                  onChange={e => updateFormField('is_below_open_price', e.target.checked)}
                />
                <span></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 高级选项 */}
      <div className="grid-strategy-form-section">
        <h2 className="grid-strategy-form-section-title">
          <span className="grid-strategy-form-section-icon">🔧</span>
          高级选项
        </h2>

        <div className="grid-strategy-form-grid">
          {/* 轮询间隔 */}
          <div className="grid-strategy-form-field">
            <label className="grid-strategy-form-label">轮询间隔（毫秒）</label>
            <NumberInput
              value={formData.polling_interval}
              onChange={(value) => updateFormField('polling_interval', (typeof value === 'number' ? value : parseFloat(value || '10000')))}
              min={0}
              step={100}
            />
            <div className="help">获得最新价格的轮询间隔时间，设为0则不限制（回测用）</div>
          </div>

          {/* 平均成本价天数 */}
          <div className="grid-strategy-form-field">
            <label className="grid-strategy-form-label">平均成本价天数</label>
            <NumberInput
              value={formData.avg_cost_price_days}
              onChange={(value) => updateFormField('avg_cost_price_days', (typeof value === 'number' ? value : parseFloat(value || '30')))}
              min={1}
              max={365}
            />
            <div className="help">计算平均成本价的默认天数</div>
          </div>
        </div>

        {/* 高级开关 */}
        <div className="grid-strategy-form-toggles">
          <div className="grid-strategy-form-toggle">
            <div className="grid-strategy-form-toggle-info">
              <label className="grid-strategy-form-label">启用日志输出</label>
              <div className="help">是否启用日志输出，便于调试和监控</div>
            </div>
            <label className="grid-strategy-toggle-switch">
              <input
                type="checkbox"
                checked={formData.enable_log}
                onChange={e => updateFormField('enable_log', e.target.checked)}
              />
              <span></span>
            </label>
          </div>

          <div className="grid-strategy-form-toggle">
            <div className="grid-strategy-form-toggle-info">
              <label className="grid-strategy-form-label">顺势仅减仓策略</label>
              <div className="help">当网格仓位记录为空但实际持有仓位时，在价格趋势中优先执行平仓</div>
            </div>
            <label className="grid-strategy-toggle-switch">
              <input
                type="checkbox"
                checked={formData.priority_close_on_trend}
                onChange={e => updateFormField('priority_close_on_trend', e.target.checked)}
              />
              <span></span>
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
