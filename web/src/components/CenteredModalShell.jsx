import { useEffect } from 'react'

export default function CenteredModalShell({ title, onClose, children, overlayStyle }) {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    return (
        <div className="hidden md:flex absolute inset-0 z-30 items-center justify-center p-6 xl:p-8">
            <div
                role="button"
                tabIndex={0}
                aria-label={title ? `关闭${title}` : '关闭弹窗'}
                onClick={onClose}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onClose?.()
                    }
                }}
                className="absolute inset-0 backdrop-blur-sm"
                style={overlayStyle}
            />

            <div
                data-centered-modal-shell="true"
                className="relative isolate pointer-events-auto w-full rounded-[28px] overflow-hidden shadow-[0_32px_120px_rgba(15,23,42,0.18)] dark:shadow-[0_36px_120px_rgba(2,6,23,0.46)] border border-[#e6edf5] dark:border-[#263241] bg-white dark:bg-[#111925]"
                style={{
                    width: 'min(760px, calc(100vw - 160px))',
                    height: 'min(860px, calc(100vh - 36px))',
                }}
            >
                <div className="flex h-full min-h-0 flex-col bg-white dark:bg-[#111925]">
                    <div className="flex items-center justify-between px-6 md:px-8 pt-4 pb-2.5 border-b border-[#e8eef5] dark:border-[#263241] flex-shrink-0">
                        <h1 className="text-[24px] md:text-[26px] font-bold text-gray-900 dark:text-white">{title}</h1>
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                            aria-label={title ? `关闭${title}` : '关闭弹窗'}
                        >
                            <span className="material-icons-outlined text-[22px] leading-none">close</span>
                        </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-6 pt-3 md:pt-4 pb-6 md:pb-8">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}
