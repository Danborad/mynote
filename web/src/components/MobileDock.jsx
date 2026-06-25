export default function MobileDock({ onCreateNote, hidden }) {
    if (hidden) return null

    return (
        <div className="md:hidden fixed right-5 bottom-[calc(12px+env(safe-area-inset-bottom))] z-50 pointer-events-none">
            <div className="flex justify-end">
                <button
                    onClick={onCreateNote}
                    className="pointer-events-auto flex h-14 w-14 rounded-full bg-[#2563eb] items-center justify-center text-white shadow-[0_18px_36px_rgba(37,99,235,0.34)] active:scale-95 transition-transform"
                    aria-label="新建笔记"
                >
                    <span className="material-icons-outlined text-[30px] leading-none">add</span>
                </button>
            </div>
        </div>
    )
}
