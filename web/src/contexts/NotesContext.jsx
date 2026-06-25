import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notesApi, foldersApi } from '../api';
import { useAuth } from './AuthContext';
import { mergeColorChangePreservingMetadata } from '../utils/noteColorBehavior';

const NotesContext = createContext(null);

function sortNotesByPinAndTime(list) {
    return [...list].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

function emitNotesChanged() {
    window.dispatchEvent(new CustomEvent('mynote:notes-changed'));
}

export function NotesProvider({ children }) {
    const { user, isCloudSession, loading: authLoading } = useAuth();
    const [notes, setNotes] = useState([]);
    const [folders, setFolders] = useState([]);
    const [selectedNote, setSelectedNote] = useState(null);
    const [currentView, setCurrentView] = useState('all'); // all, favorites, trash, folder
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [favoritesCount, setFavoritesCount] = useState(0);
    const [trashCount, setTrashCount] = useState(0);
    const [allNotesCount, setAllNotesCount] = useState(0);

    // 加载笔记
    const loadNotes = useCallback(async () => {
        if (authLoading || !user) {
            setNotes([]);
            setSelectedNote(null);
            setFavoritesCount(0);
            setTrashCount(0);
            setAllNotesCount(0);
            return;
        }

        if (currentView === 'settings' || currentView === 'shares') {
            return;
        }

        setLoading(true);
        setError(null);
        try {
            let data;
            switch (currentView) {
                case 'favorites':
                    data = await notesApi.getFavorites();
                    break;
                case 'trash':
                    data = await notesApi.getTrash();
                    break;
                case 'folder':
                    data = await notesApi.getAll(currentFolderId);
                    break;
                default:
                    data = await notesApi.getAll();
            }
            setNotes(data);

            // 获取收藏和废纸篓计数
            try {
                const [favData, trashData, allData] = await Promise.all([
                    notesApi.getFavorites(),
                    notesApi.getTrash(),
                    notesApi.getAll(),
                ]);
                setFavoritesCount(favData.length);
                setTrashCount(trashData.length);
                setAllNotesCount(allData.length);
            } catch (e) {
                console.error('Failed to load counts', e);
            }
        } catch (err) {
            setError(err.message);
            setNotes([]);
        } finally {
            setLoading(false);
        }
    }, [currentView, currentFolderId, authLoading, isCloudSession, user]);

    // 加载文件夹
    const loadFolders = useCallback(async () => {
        if (authLoading || !user) {
            setFolders([]);
            return;
        }
        try {
            const data = await foldersApi.getAll();
            setFolders(data);
        } catch (err) {
            console.error('加载文件夹失败:', err);
        }
    }, [authLoading, isCloudSession, user]);

    // 初始化加载
    useEffect(() => {
        if (authLoading) return;
        loadNotes();
        loadFolders();
    }, [currentView, currentFolderId, loadNotes, loadFolders, authLoading, isCloudSession]);

    // 创建笔记
    const createNote = async (data = {}) => {
        try {
            const newNote = await notesApi.create({
                title: data.title || '无标题笔记',
                content: data.content || '',
                folderId: currentFolderId,
                ...data,
            });
            setNotes(prev => sortNotesByPinAndTime([newNote, ...prev]));
            setSelectedNote(newNote);
            emitNotesChanged();
            return newNote;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // 更新笔记
    const updateNote = async (id, data) => {
        try {
            const updated = await notesApi.update(id, data);
            setNotes(prev => sortNotesByPinAndTime(prev.map(n => n.id === id ? updated : n)));
            if (selectedNote?.id === id) {
                setSelectedNote(updated);
            }
            emitNotesChanged();
            return updated;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // 删除笔记
    const deleteNote = async (id) => {
        try {
            await notesApi.delete(id);
            setNotes(prev => prev.filter(n => n.id !== id));
            if (selectedNote?.id === id) {
                setSelectedNote(notes.find(n => n.id !== id) || null);
            }
            emitNotesChanged();
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // 切换收藏
    const toggleFavorite = async (id) => {
        try {
            const updated = await notesApi.toggleFavorite(id);
            setNotes(prev => sortNotesByPinAndTime(prev.map(n => n.id === id ? updated : n)));
            if (selectedNote?.id === id) {
                setSelectedNote(updated);
            }
            emitNotesChanged();
        } catch (err) {
            setError(err.message);
        }
    };

    // 切换置顶
    const togglePin = async (id) => {
        try {
            const updated = await notesApi.togglePin(id);
            setNotes(prev => sortNotesByPinAndTime(prev.map(n => n.id === id ? updated : n)));
            if (selectedNote?.id === id) {
                setSelectedNote(updated);
            }
            emitNotesChanged();
        } catch (err) {
            setError(err.message);
        }
    };

    // 设置颜色
    const setNoteColor = async (id, color) => {
        try {
            const updated = await notesApi.setColor(id, color);
            setNotes(prev => sortNotesByPinAndTime(prev.map(n => n.id === id ? mergeColorChangePreservingMetadata(n, updated) : n)));
            if (selectedNote?.id === id) {
                setSelectedNote(prev => mergeColorChangePreservingMetadata(prev, updated));
            }
            emitNotesChanged();
        } catch (err) {
            setError(err.message);
        }
    };

    // 恢复笔记
    const restoreNote = async (id) => {
        try {
            await notesApi.restore(id);
            setNotes(prev => prev.filter(n => n.id !== id));
            emitNotesChanged();
        } catch (err) {
            setError(err.message);
        }
    };

    // 彻底删除笔记
    const permanentDeleteNote = async (id) => {
        try {
            await notesApi.permanentDelete(id);
            setNotes(prev => prev.filter(n => n.id !== id));
            if (selectedNote?.id === id) {
                setSelectedNote(null);
            }
            setTrashCount(prev => Math.max(0, prev - 1));
            emitNotesChanged();
        } catch (err) {
            setError(err.message);
        }
    };

    // 清空废纸篓
    const emptyTrash = async () => {
        try {
            await notesApi.emptyTrash();
            if (currentView === 'trash') {
                setNotes([]);
                setSelectedNote(null);
            }
            setTrashCount(0);
            emitNotesChanged();
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // 切换视图
    const switchView = (view, folderId = null) => {
        setCurrentView(view);
        setCurrentFolderId(folderId);
        setSelectedNote(null);
    };

    // 创建文件夹
    const createFolder = async (name, parentId = null) => {
        try {
            const newFolder = await foldersApi.create({ name, parentId });
            setFolders(prev => [...prev, newFolder]);
            return newFolder;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // 更新文件夹
    const updateFolder = async (id, data) => {
        try {
            const updated = await foldersApi.update(id, data);
            setFolders(prev => prev.map(f => f.id === id ? updated : f));
            return updated;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // 删除文件夹
    const deleteFolder = async (id) => {
        try {
            await foldersApi.delete(id);
            setFolders(prev => prev.filter(f => f.id !== id));
            // 如果当前在被删除的文件夹视图，切换到全部笔记
            if (currentFolderId === id) {
                switchView('all');
            }
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const reorderFolders = async (orderedFolderIds) => {
        const previousFolders = folders;
        const folderMap = new Map(previousFolders.map(folder => [folder.id, folder]));
        const reordered = orderedFolderIds
            .map((id, index) => {
                const folder = folderMap.get(id);
                if (!folder) return null;
                return { ...folder, sortOrder: index + 1 };
            })
            .filter(Boolean);

        if (reordered.length !== previousFolders.length) {
            return;
        }

        setFolders(reordered);

        try {
            await Promise.all(
                reordered.map(folder => foldersApi.update(folder.id, { sortOrder: folder.sortOrder }))
            );
        } catch (err) {
            setFolders(previousFolders);
            setError(err.message);
            throw err;
        }
    };

    // 移动笔记到文件夹
    const moveNoteToFolder = async (noteId, folderId) => {
        try {
            const updated = await notesApi.update(noteId, { folderId });
            setNotes(prev => sortNotesByPinAndTime(prev.map(n => n.id === noteId ? updated : n)));
            if (selectedNote?.id === noteId) {
                setSelectedNote(updated);
            }
            emitNotesChanged();
            return updated;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    return (
        <NotesContext.Provider value={{
            notes,
            folders,
            selectedNote,
            currentView,
            currentFolderId,
            loading,
            error,
            favoritesCount,
            trashCount,
            allNotesCount,
            setSelectedNote,
            loadNotes,
            loadFolders,
            createNote,
            updateNote,
            deleteNote,
            toggleFavorite,
            togglePin,
            setNoteColor,
            restoreNote,
            permanentDeleteNote,
            emptyTrash,
            switchView,
            createFolder,
            updateFolder,
            deleteFolder,
            reorderFolders,
            moveNoteToFolder,
        }}>
            {children}
        </NotesContext.Provider>
    );
}

export function useNotes() {
    const context = useContext(NotesContext);
    if (!context) {
        throw new Error('useNotes must be used within a NotesProvider');
    }
    return context;
}
