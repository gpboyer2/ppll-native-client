/**
 * 全局加载组件
 *
 * 在应用初始化时显示，等待 Wails 环境就绪
 */
import React, { useEffect } from 'react';
import { useAppInitStore } from '../stores/app-init-store';
import logo from '../assets/images/logo-universal.png';

export const GlobalLoading: React.FC = () => {
  const { appReady, error, progress, init } = useAppInitStore();

  useEffect(() => {
    // 开始初始化
    init();
  }, []);

  // 如果已就绪，不显示任何内容
  if (appReady) {
    return null;
  }

  // 发生错误
  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        zIndex: 'var(--z-global-loading)',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>初始化失败</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 正在加载
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      zIndex: 'var(--z-global-loading)',
    }}>
      <div style={{ textAlign: 'center' }}>
        {/* Logo */}
        <img
          src={logo}
          alt="PPLL Logo"
          style={{
            width: '80px',
            height: '80px',
            marginBottom: '24px',
            opacity: 0.8,
          }}
        />

        {/* Loading 动画 */}
        <div className="loading" style={{
          width: '48px',
          height: '48px',
          borderWidth: '4px',
          margin: '0 auto 24px',
        }}></div>

        {/* 文本提示 */}
        <h2 style={{
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--color-text)',
          marginBottom: '12px',
        }}>
          正在启动 PPLL 量化交易客户端
        </h2>

        <p style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          marginBottom: '24px',
        }}>
          正在初始化系统环境，请稍候...
        </p>

        {/* 进度条 */}
        <div style={{
          width: '240px',
          height: '4px',
          background: 'var(--color-border)',
          borderRadius: '2px',
          margin: '0 auto',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'var(--color-primary)',
            transition: 'width 0.3s ease',
          }}></div>
        </div>

        {/* 提示信息 */}
        <p style={{
          fontSize: '12px',
          color: 'var(--color-text-tertiary)',
          marginTop: '16px',
        }}>
          首次启动可能需要几秒钟时间
        </p>
      </div>
    </div>
  );
};
