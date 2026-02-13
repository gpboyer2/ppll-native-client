import React, { useEffect, useCallback } from 'react'
import { Modal as MantineModal, ModalProps as MantineModalProps, Button } from '@mantine/core'
import { PPLLMantineProvider } from '../../core/MantineProvider'
import './Modal.scss'

/**
 * PPLL 项目专用的 Mantine 模态框组件
 *
 * 特性：
 * - 自动包装 MantineProvider，样式隔离
 * - 适配币安风格主题
 * - 支持键盘快捷键（Enter 确认，Esc 取消）
 */

export interface PPLLModalProps extends Omit<MantineModalProps, 'onClose'> {
  /** 确认按钮文本 */
  confirmText?: string
  /** 取消按钮文本 */
  cancelText?: string
  /** 确认回调 */
  onConfirm?: () => void
  /** 取消回调 */
  onCancel?: () => void
  /** 关闭回调 */
  onClose?: () => void
}

export function Modal(props: PPLLModalProps): JSX.Element {
  const {
    opened,
    onClose,
    onConfirm,
    onCancel,
    confirmText = '确认',
    cancelText = '取消',
    title,
    children,
    ...restProps
  } = props

  const handleClose = useCallback(() => {
    onClose?.()
    onCancel?.()
  }, [onClose, onCancel])

  const handleConfirm = useCallback(() => {
    onConfirm?.()
  }, [onConfirm])

  useEffect(() => {
    if (!opened) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleConfirm()
        handleClose()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [opened, handleConfirm, handleClose])

  return (
    <PPLLMantineProvider>
      <MantineModal opened={opened} onClose={handleClose} title={title} centered {...restProps}>
        {children}
        <div className="modal-actions">
          <Button variant="default" onClick={handleClose}>
            {cancelText}
          </Button>
          <Button onClick={handleConfirm}>{confirmText}</Button>
        </div>
      </MantineModal>
    </PPLLMantineProvider>
  )
}

/**
 * 确认弹窗组件
 */
export interface ConfirmModalProps extends Omit<PPLLModalProps, 'title' | 'children'> {
  /** 弹窗标题 */
  title: string
  /** 确认内容 */
  content: string
}

export function ConfirmModal(props: ConfirmModalProps): JSX.Element {
  const { title, content, ...restProps } = props

  return (
    <Modal title={title} {...restProps}>
      <p className="modal-content">{content}</p>
    </Modal>
  )
}
