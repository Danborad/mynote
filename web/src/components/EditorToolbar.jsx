function EditorToolbar({ onAction, compact = false }) {
    return (
        <div className={`flex fixed md:absolute left-1/2 -translate-x-1/2 bottom-[calc(10px+env(safe-area-inset-bottom))] ${compact ? 'md:bottom-7' : 'md:bottom-6'} bg-white dark:bg-[#111925] border border-[#e7edf5] dark:border-[#283445] rounded-2xl shadow-[0_12px_26px_rgba(15,23,42,0.10)] dark:shadow-[0_18px_30px_rgba(2,6,14,0.24)] ${compact ? 'px-3 md:px-3.5 py-1.5 md:py-2 space-x-2.5 md:space-x-3.5' : 'px-3 py-2 md:px-6 md:py-3 space-x-3 md:space-x-6'} items-center justify-center z-50 w-auto min-w-fit max-w-[calc(100vw-7rem)] overflow-x-auto no-scrollbar`}>
            {/* 文本格式化 */}
            <button
                onClick={() => onAction('bold')}
                className={`text-gray-500 hover:text-gray-900 dark:text-text-muted dark:hover:text-text-main transition-colors font-serif font-bold ${compact ? 'text-base' : 'text-lg'}`}
                title="加粗"
            >
                B
            </button>
            <button
                onClick={() => onAction('italic')}
                className={`text-gray-500 hover:text-gray-900 dark:text-text-muted dark:hover:text-text-main transition-colors italic font-serif ${compact ? 'text-base' : 'text-lg'}`}
                title="斜体"
            >
                I
            </button>
            <button
                onClick={() => onAction('underline')}
                className={`text-gray-500 hover:text-gray-900 dark:text-text-muted dark:hover:text-text-main transition-colors underline font-serif ${compact ? 'text-base' : 'text-lg'}`}
                title="下划线"
            >
                U
            </button>

            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>

            {/* 列表 */}
            <button
                onClick={() => onAction('list')}
                className="text-gray-500 hover:text-gray-900 dark:text-text-muted dark:hover:text-text-main transition-colors"
                title="无序列表"
            >
                <span className={`material-icons-outlined ${compact ? 'text-lg' : 'text-xl'}`}>format_list_bulleted</span>
            </button>
            <button
                onClick={() => onAction('checkbox')}
                className="text-gray-500 hover:text-gray-900 dark:text-text-muted dark:hover:text-text-main transition-colors"
                title="任务列表"
            >
                <span className={`material-icons-outlined ${compact ? 'text-lg' : 'text-xl'}`}>check_box</span>
            </button>
            <button
                onClick={() => onAction('codeblock')}
                className="text-gray-500 hover:text-gray-900 dark:text-text-muted dark:hover:text-text-main transition-colors"
                title="代码块"
            >
                <span className={`material-icons-outlined ${compact ? 'text-lg' : 'text-xl'}`}>code</span>
            </button>

            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>

            {/* 媒体 */}
            <button
                onClick={() => onAction('image')}
                className="text-gray-500 hover:text-gray-900 dark:text-text-muted dark:hover:text-text-main transition-colors"
                title="插入图片"
            >
                <span className={`material-icons-outlined ${compact ? 'text-lg' : 'text-xl'}`}>image</span>
            </button>
            <button
                onClick={() => onAction('file')}
                className={`bg-[#2563eb] hover:bg-[#1d4ed8] text-white ${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg transition-colors flex items-center justify-center`}
                title="插入链接/附件"
            >
                <span className="material-icons-outlined text-base leading-none">attach_file</span>
            </button>
        </div>
    )
}

export default EditorToolbar
