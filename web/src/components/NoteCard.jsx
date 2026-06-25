function NoteCard({ note, isSelected, onClick }) {
    const baseClasses = "rounded-2xl cursor-pointer transition-all duration-200"

    // 高亮样式（选中状态）
    if (isSelected) {
        return (
            <div
                className={`${baseClasses} bg-primary/5 dark:bg-card-dark p-5 shadow-md border-2 border-primary`}
                onClick={onClick}
            >
                <h3 className="font-bold text-lg mb-2 text-primary dark:text-text-main">{note.title}</h3>
                <p className="text-sm text-gray-600 dark:text-text-muted line-clamp-2 mb-3">{note.content}</p>
                <div className="mt-3 text-xs text-primary dark:text-text-muted font-medium">{note.date}</div>
            </div>
        )
    }

    // 带封面图片的卡片
    if (note.type === 'image') {
        return (
            <div
                className={`${baseClasses} bg-surface-light dark:bg-card-dark overflow-hidden shadow-sm hover:shadow-md border border-transparent hover:border-primary/30 group`}
                onClick={onClick}
            >
                <div className="h-28 bg-gray-700 relative overflow-hidden">
                    <img
                        alt={note.title}
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                        src={note.image}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
                <div className="p-4">
                    <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-text-main">{note.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-text-muted line-clamp-2 leading-relaxed">{note.content}</p>
                    <div className="mt-3 text-xs text-gray-400 dark:text-gray-500 font-medium">{note.date}</div>
                </div>
            </div>
        )
    }

    // 带缩略图的卡片
    if (note.type === 'thumbnail') {
        return (
            <div
                className={`${baseClasses} bg-surface-light dark:bg-card-dark p-4 shadow-sm hover:shadow-md border border-transparent hover:border-primary/30 flex gap-4`}
                onClick={onClick}
            >
                <div className="w-20 h-20 flex-shrink-0 bg-sky-100 rounded-lg overflow-hidden relative">
                    <img alt={note.title} className="w-full h-full object-cover" src={note.image} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-base text-gray-900 dark:text-text-main truncate">{note.title}</h3>
                        {note.price && (
                            <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">{note.price}</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-text-muted line-clamp-2">{note.content}</p>
                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">{note.date}</div>
                </div>
            </div>
        )
    }

    // 列表形式卡片
    if (note.type === 'list') {
        return (
            <div
                className={`${baseClasses} bg-surface-light dark:bg-card-dark p-5 shadow-sm hover:shadow-md border border-transparent hover:border-primary/30`}
                onClick={onClick}
            >
                <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-text-main">{note.title}</h3>
                <ul className="space-y-2">
                    {note.items?.map((item, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600 dark:text-text-muted">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2.5"></span>
                            {item}
                        </li>
                    ))}
                </ul>
                <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 font-medium">{note.date}</div>
            </div>
        )
    }

    // 渐变背景卡片（灵感类）
    if (note.type === 'gradient') {
        return (
            <div
                className={`${baseClasses} p-5 shadow-sm hover:shadow-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative overflow-hidden`}
                onClick={onClick}
            >
                <span className="material-icons-outlined text-4xl mb-2 opacity-80">lightbulb</span>
                <h3 className="font-bold text-lg mb-1">{note.title}</h3>
                <p className="text-sm opacity-90 leading-relaxed">{note.content}</p>
                <div className="mt-3 text-xs opacity-75">{note.date}</div>
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white opacity-10 rounded-full"></div>
            </div>
        )
    }

    // 密码/代码卡片
    if (note.type === 'password') {
        return (
            <div
                className={`${baseClasses} bg-surface-light dark:bg-card-dark p-5 shadow-sm hover:shadow-md border border-transparent hover:border-primary/30`}
                onClick={onClick}
            >
                <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-text-main">{note.title}</h3>
                <div className="bg-gray-100 dark:bg-background-dark p-3 rounded-lg font-mono text-center text-gray-800 dark:text-text-main text-sm tracking-wider border border-gray-200 dark:border-border-dark">
                    {note.content}
                </div>
                <div className="mt-3 text-xs text-gray-400 dark:text-gray-500 font-medium text-right">{note.date}</div>
            </div>
        )
    }

    // 默认卡片
    return (
        <div
            className={`${baseClasses} bg-surface-light dark:bg-card-dark p-5 shadow-sm hover:shadow-md border border-transparent hover:border-primary/30`}
            onClick={onClick}
        >
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-text-main">{note.title}</h3>
            <p className="text-sm text-gray-500 dark:text-text-muted line-clamp-2">{note.content}</p>
            <div className="mt-3 text-xs text-gray-400 dark:text-gray-500 font-medium">{note.date}</div>
        </div>
    )
}

export default NoteCard
