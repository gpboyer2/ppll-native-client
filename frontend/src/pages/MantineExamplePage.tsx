import React, { useState } from 'react';
import { PPLLMantineProvider, useMantineWrapper } from '../core/MantineProvider';

/**
 * Mantine 集成示例页面
 * 
 * 演示如何在 PPLL 项目中局部使用 Mantine 组件
 * 展示样式隔离效果和主题适配
 */

function MantineExamplePage() {
  const [showMantine, setShowMantine] = useState(false);
  const MantineWrapper = useMantineWrapper();

  return (
    <div className="container">
      <section className="surface p-16 mb-16">
        <h1>Mantine 局部集成示例</h1>
        <p className="text-muted">
          演示如何在 PPLL 项目中局部使用 Mantine 组件，确保样式隔离和主题一致性。
        </p>
      </section>

      {/* 现有项目样式区域 */}
      <section className="surface p-16 mb-16">
        <h2>现有项目样式（不受影响）</h2>
        <div className="flex gap-12 mb-12">
          <button className="btn btn-primary">项目主要按钮</button>
          <button className="btn btn-outline">项目轮廓按钮</button>
          <button className="btn btn-ghost">项目幽灵按钮</button>
        </div>
        
        <div className="card">
          <div className="card-header">项目原有卡片</div>
          <div className="card-content">
            <p>这是使用项目原有样式系统的卡片组件，不会受到 Mantine 样式的影响。</p>
            <div className="flex gap-8">
              <span className="tag">标签1</span>
              <span className="tag success">成功标签</span>
              <span className="tag danger">危险标签</span>
            </div>
          </div>
        </div>
      </section>

      {/* 控制开关 */}
      <section className="surface p-16 mb-16">
        <h2>Mantine 组件控制</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowMantine(!showMantine)}
        >
          {showMantine ? '隐藏' : '显示'} Mantine 组件
        </button>
      </section>

      {/* Mantine 组件区域 - 方式一：使用 Provider 包装 */}
      {showMantine && (
        <PPLLMantineProvider>
          <section className="surface p-16 mb-16">
            <h2>Mantine 组件区域（Provider 包装）</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              这个区域使用 PPLLMantineProvider 包装，Mantine 组件在此生效。
            </p>
            
            {/* 注意：这里需要等依赖安装后才能正常工作 */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              {/* 
              <Button color="yellow" size="sm">Mantine 主要按钮</Button>
              <Button variant="outline" size="sm">Mantine 轮廓按钮</Button>
              <Button variant="subtle" size="sm">Mantine 细微按钮</Button>
              */}
              <div style={{ 
                padding: '8px 16px', 
                backgroundColor: 'var(--color-primary)', 
                color: '#000',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600
              }}>
                模拟 Mantine 按钮（需安装依赖后生效）
              </div>
            </div>

            {/* 
            <Card withBorder radius="md" style={{ marginBottom: '16px' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <h3>Mantine 卡片标题</h3>
              </Card.Section>
              <Card.Section inheritPadding py="xs">
                <p>这是 Mantine 卡片的内容区域，使用了适配的币安深色主题。</p>
              </Card.Section>
            </Card>
            */}
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px'
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border)',
                fontWeight: 600
              }}>
                模拟 Mantine 卡片（需安装依赖后生效）
              </div>
              <div style={{ padding: '16px' }}>
                <p>这是 Mantine 卡片的内容区域，使用了适配的币安深色主题。</p>
              </div>
            </div>
          </section>
        </PPLLMantineProvider>
      )}

      {/* Mantine 组件区域 - 方式二：使用 Hook */}
      {showMantine && (
        <section className="surface p-16 mb-16">
          <h2>Mantine 组件区域（Hook 方式）</h2>
          <p className="text-muted mb-12">
            这个区域使用 useMantineWrapper Hook，实现更灵活的局部包装。
          </p>
          
          <div className="flex gap-16">
            <div>
              <h3>普通内容</h3>
              <button className="btn btn-outline">项目按钮</button>
            </div>
            
            <MantineWrapper>
              <div>
                <h3>Mantine 内容</h3>
                <div style={{ 
                  padding: '8px 16px', 
                  backgroundColor: 'var(--color-primary)', 
                  color: '#000',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'inline-block'
                }}>
                  模拟 Mantine 按钮
                </div>
              </div>
            </MantineWrapper>
          </div>
        </section>
      )}

      {/* 样式对比区域 */}
      <section className="surface p-16 mb-16">
        <h2>样式对比</h2>
        <div className="grid-2 gap-16">
          <div>
            <h3>项目原有样式</h3>
            <div className="form-row">
              <label className="label">用户名</label>
              <input className="input" placeholder="请输入用户名" />
            </div>
            <div className="form-row">
              <label className="label">密码</label>
              <input className="input" type="password" placeholder="请输入密码" />
            </div>
            <button className="btn btn-primary">登录</button>
          </div>
          
          <div>
            <h3>Mantine 样式（模拟）</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ 
                fontSize: '13px', 
                color: 'var(--color-text-muted)',
                display: 'block',
                marginBottom: '6px'
              }}>
                用户名
              </label>
              <input 
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}
                placeholder="请输入用户名" 
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ 
                fontSize: '13px', 
                color: 'var(--color-text-muted)',
                display: 'block',
                marginBottom: '6px'
              }}>
                密码
              </label>
              <input 
                type="password"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}
                placeholder="请输入密码" 
              />
            </div>
            <div style={{ 
              padding: '8px 16px', 
              backgroundColor: 'var(--color-primary)', 
              color: '#000',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-block',
              cursor: 'pointer'
            }}>
              登录
            </div>
          </div>
        </div>
      </section>

      {/* 使用说明 */}
      <section className="surface p-16">
        <h2>使用说明</h2>
        <div className="text-muted">
          <h3>安装依赖</h3>
          <pre style={{ 
            backgroundColor: 'var(--color-bg-muted)', 
            padding: '12px', 
            borderRadius: 'var(--radius-sm)',
            marginBottom: '12px',
            overflow: 'auto'
          }}>
{`npm install @mantine/core @mantine/hooks @mantine/form \\
  @mantine/dates @mantine/notifications @mantine/modals \\
  @emotion/react`}
          </pre>
          
          <h3>基本使用</h3>
          <pre style={{ 
            backgroundColor: 'var(--color-bg-muted)', 
            padding: '12px', 
            borderRadius: 'var(--radius-sm)',
            marginBottom: '12px',
            overflow: 'auto'
          }}>
{`import { Button, Card } from '@/components/mantine';

function MyComponent() {
  return (
    <div>
      <Button binanceStyle>币安风格按钮</Button>
      <Card>
        <Card.Section>卡片内容</Card.Section>
      </Card>
    </div>
  );
}`}
          </pre>
          
          <p>
            <strong>注意：</strong>当前页面展示的是模拟效果，实际的 Mantine 组件需要安装依赖后才能正常使用。
            所有 Mantine 组件都会自动适配项目的币安深色主题，并且不会影响项目中其他区域的样式。
          </p>
        </div>
      </section>
    </div>
  );
}

export default MantineExamplePage;
