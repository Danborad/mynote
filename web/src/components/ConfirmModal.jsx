import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// 通用确认弹窗组件
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = '确定', cancelText = '取消', danger = false }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 弹窗内容 */}
            <div className="relative bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6">
                    {title && (
                        <h3 className="text-lg font-bold text-gray-900 dark:text-text-main mb-2">
                            {title}
                        </h3>
                    )}
                    <p className="text-gray-600 dark:text-text-muted">
                        {message}
                    </p>
                </div>

                <div className="flex border-t border-gray-100 dark:border-border-dark">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-gray-600 dark:text-text-muted hover:bg-gray-50 dark:hover:bg-card-dark transition-colors font-medium"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm()
                            onClose()
                        }}
                        className={`flex-1 py-3 font-medium transition-colors border-l border-gray-100 dark:border-border-dark ${danger
                                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                : 'text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export function PromptModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    value,
    onChange,
    placeholder = '',
    confirmText = '确定',
    cancelText = '取消',
}) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 space-y-3">
                    {title ? (
                        <h3 className="text-lg font-bold text-gray-900 dark:text-text-main">{title}</h3>
                    ) : null}
                    {message ? (
                        <p className="text-gray-600 dark:text-text-muted">{message}</p>
                    ) : null}
                    <input
                        autoFocus
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                onConfirm()
                            }
                        }}
                        placeholder={placeholder}
                        className="w-full rounded-2xl border border-[#dbe3ee] dark:border-[#2a3b50] bg-white dark:bg-[#111925] px-4 py-3 text-[15px] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                    />
                </div>

                <div className="flex border-t border-gray-100 dark:border-border-dark">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-gray-600 dark:text-text-muted hover:bg-gray-50 dark:hover:bg-card-dark transition-colors font-medium"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 font-medium transition-colors border-l border-gray-100 dark:border-border-dark text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    )
}

// Hook 用于方便调用确认弹窗
export function useConfirm() {
    const [state, setState] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '确定',
        cancelText: '取消',
        danger: false,
        resolve: null
    })

    const confirm = useCallback(({ title = '', message, confirmText = '确定', cancelText = '取消', danger = false }) => {
        return new Promise((resolve) => {
            setState({
                isOpen: true,
                title,
                message,
                confirmText,
                cancelText,
                danger,
                resolve
            })
        })
    }, [])

    const handleClose = useCallback(() => {
        state.resolve?.(false)
        setState(prev => ({ ...prev, isOpen: false }))
    }, [state.resolve])

    const handleConfirm = useCallback(() => {
        state.resolve?.(true)
    }, [state.resolve])

    const ConfirmDialog = useCallback(() => (
        <ConfirmModal
            isOpen={state.isOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            title={state.title}
            message={state.message}
            confirmText={state.confirmText}
            cancelText={state.cancelText}
            danger={state.danger}
        />
    ), [state, handleClose, handleConfirm])

    return { confirm, ConfirmDialog }
}

export function usePrompt() {
    const [state, setState] = useState({
        isOpen: false,
        title: '',
        message: '',
        placeholder: '',
        confirmText: '确定',
        cancelText: '取消',
        value: '',
        resolve: null,
    })

    const prompt = useCallback(({ title = '', message = '', placeholder = '', defaultValue = '', confirmText = '确定', cancelText = '取消' }) => {
        return new Promise((resolve) => {
            setState({
                isOpen: true,
                title,
                message,
                placeholder,
                confirmText,
                cancelText,
                value: defaultValue,
                resolve,
            })
        })
    }, [])

    const handleClose = useCallback(() => {
        state.resolve?.(null)
        setState((prev) => ({ ...prev, isOpen: false }))
    }, [state.resolve])

    const handleConfirm = useCallback(() => {
        state.resolve?.(state.value)
        setState((prev) => ({ ...prev, isOpen: false }))
    }, [state.resolve, state.value])

    const PromptDialog = useCallback(() => (
        <PromptModal
            isOpen={state.isOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            title={state.title}
            message={state.message}
            value={state.value}
            onChange={(value) => setState((prev) => ({ ...prev, value }))}
            placeholder={state.placeholder}
            confirmText={state.confirmText}
            cancelText={state.cancelText}
        />
    ), [state, handleClose, handleConfirm])

    return { prompt, PromptDialog }
}

export default ConfirmModal
