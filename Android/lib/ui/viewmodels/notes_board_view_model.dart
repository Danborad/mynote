import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/domain/entities/folder_item.dart';
import 'package:mynote_android/domain/entities/note_item.dart';

enum NotesWorkspaceView {
  all,
  favorites,
  shares,
  trash,
  settings,
  editor,
}

class NotesBoardState {
  const NotesBoardState({
    this.notes = const [],
    this.folders = const [],
    this.sharedLinks = const [],
    this.stats = const {},
    this.selectedFolderId,
    this.loading = false,
    this.error,
    this.currentView = NotesWorkspaceView.all,
    this.selectedNote,
    this.searchQuery = '',
  });

  final List<NoteItem> notes;
  final List<FolderItem> folders;
  final List<Map<String, dynamic>> sharedLinks;
  final Map<String, dynamic> stats;
  final String? selectedFolderId;
  final bool loading;
  final String? error;
  final NotesWorkspaceView currentView;
  final NoteItem? selectedNote;
  final String searchQuery;

  int get notesCount => (stats['totalNotes'] as num?)?.toInt() ?? notes.length;
  int get favoritesCount =>
      (stats['favoritesCount'] as num?)?.toInt() ??
      notes.where((note) => note.isFavorite).length;
  int get trashCount => (stats['trashCount'] as num?)?.toInt() ?? 0;
  int get storageUsageBytes =>
      (stats['storageUsed'] as num?)?.toInt() ??
      (stats['totalStorageBytes'] as num?)?.toInt() ??
      (stats['notesStorageBytes'] as num?)?.toInt() ??
      (stats['storageUsage'] as num?)?.toInt() ??
      (stats['usedStorage'] as num?)?.toInt() ??
      (stats['storageBytes'] as num?)?.toInt() ??
      notes.fold<int>(0, (sum, note) => sum + note.content.length);

  NotesBoardState copyWith({
    List<NoteItem>? notes,
    List<FolderItem>? folders,
    List<Map<String, dynamic>>? sharedLinks,
    Map<String, dynamic>? stats,
    Object? selectedFolderId = _sentinel,
    bool? loading,
    Object? error = _sentinel,
    NotesWorkspaceView? currentView,
    Object? selectedNote = _sentinel,
    String? searchQuery,
  }) {
    return NotesBoardState(
      notes: notes ?? this.notes,
      folders: folders ?? this.folders,
      sharedLinks: sharedLinks ?? this.sharedLinks,
      stats: stats ?? this.stats,
      selectedFolderId: identical(selectedFolderId, _sentinel)
          ? this.selectedFolderId
          : selectedFolderId as String?,
      loading: loading ?? this.loading,
      error: identical(error, _sentinel) ? this.error : error as String?,
      currentView: currentView ?? this.currentView,
      selectedNote: identical(selectedNote, _sentinel)
          ? this.selectedNote
          : selectedNote as NoteItem?,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

const _sentinel = Object();

class NotesBoardViewModel extends StateNotifier<NotesBoardState> {
  NotesBoardViewModel(this.ref) : super(const NotesBoardState());

  final Ref ref;

  Future<void> load({String? folderId}) async {
    await _loadWorkspace(
      currentView: NotesWorkspaceView.all,
      folderId: folderId,
      preserveSelectedNote: false,
    );
  }

  Future<void> loadFavorites() async {
    await _loadWorkspace(currentView: NotesWorkspaceView.favorites);
  }

  Future<void> loadTrash() async {
    await _loadWorkspace(currentView: NotesWorkspaceView.trash);
  }

  Future<void> loadShares() async {
    state = state.copyWith(
      loading: true,
      error: null,
      currentView: NotesWorkspaceView.shares,
      selectedNote: null,
      selectedFolderId: null,
    );
    try {
      final sharedLinks =
          await ref.read(notesRepositoryProvider).getSharedLinks();
      final stats = await _loadStats();
      state = state.copyWith(
        loading: false,
        sharedLinks: sharedLinks,
        notes: const [],
        stats: stats,
      );
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  void openSettings() {
    state = state.copyWith(
      currentView: NotesWorkspaceView.settings,
      selectedNote: null,
      error: null,
    );
  }

  Future<NoteItem?> openNote(String id) async {
    NoteItem? existing;
    for (final note in state.notes) {
      if (note.id == id) {
        existing = note;
        break;
      }
    }

    if (existing != null && existing.isDeleted) {
      state = state.copyWith(
        currentView: NotesWorkspaceView.editor,
        selectedNote: existing,
        error: null,
      );
      return existing;
    }

    state = state.copyWith(loading: true, error: null);
    try {
      final note = await ref.read(notesRepositoryProvider).getById(id);
      state = state.copyWith(
        loading: false,
        currentView: NotesWorkspaceView.editor,
        selectedNote: note ?? existing,
      );
      return note ?? existing;
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
      return null;
    }
  }

  Future<NoteItem?> createDraft({String? folderId}) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final note = await ref.read(notesRepositoryProvider).create(
            title: '新建笔记',
            content: '',
            folderId: folderId ?? state.selectedFolderId,
          );
      state = state.copyWith(
        loading: false,
        currentView: NotesWorkspaceView.editor,
        selectedNote: note,
      );
      return note;
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
      return null;
    }
  }

  Future<void> saveNote({
    required String id,
    required String title,
    required String content,
    String? folderId,
  }) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final note = await ref.read(notesRepositoryProvider).update(
            id: id,
            title: title,
            content: content,
            folderId: folderId,
          );
      state = state.copyWith(selectedNote: note, loading: false);
      await reloadCurrent();
      state = state.copyWith(selectedNote: note);
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> restoreSelectedNote() async {
    final note = state.selectedNote;
    if (note == null) return;
    state = state.copyWith(loading: true, error: null);
    try {
      await ref.read(notesRepositoryProvider).restore(note.id);
      await loadTrash();
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> permanentlyDeleteSelectedNote() async {
    final note = state.selectedNote;
    if (note == null) return;
    state = state.copyWith(loading: true, error: null);
    try {
      await ref.read(notesRepositoryProvider).permanentDelete(note.id);
      await loadTrash();
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> shareSelectedNote() async {
    final note = state.selectedNote;
    if (note == null) return;
    state = state.copyWith(loading: true, error: null);
    try {
      await ref.read(notesRepositoryProvider).share(note.id);
      state = state.copyWith(loading: false);
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> toggleFavoriteSelectedNote() async {
    final note = state.selectedNote;
    if (note == null) return;
    state = state.copyWith(loading: true, error: null);
    try {
      final updated =
          await ref.read(notesRepositoryProvider).toggleFavorite(note.id);
      state = state.copyWith(selectedNote: updated, loading: false);
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> togglePinSelectedNote() async {
    final note = state.selectedNote;
    if (note == null) return;
    state = state.copyWith(loading: true, error: null);
    try {
      final updated =
          await ref.read(notesRepositoryProvider).togglePin(note.id);
      state = state.copyWith(selectedNote: updated, loading: false);
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> deleteSelectedNote() async {
    final note = state.selectedNote;
    if (note == null) return;
    state = state.copyWith(loading: true, error: null);
    try {
      await ref.read(notesRepositoryProvider).delete(note.id);
      await load();
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> deleteNotes(Iterable<String> ids) async {
    final targets = ids.toSet();
    if (targets.isEmpty) return;

    state = state.copyWith(loading: true, error: null);
    try {
      for (final id in targets) {
        await ref.read(notesRepositoryProvider).delete(id);
      }
      await reloadCurrent();
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> restoreNotes(Iterable<String> ids) async {
    final targets = ids.toSet();
    if (targets.isEmpty) return;

    state = state.copyWith(loading: true, error: null);
    try {
      for (final id in targets) {
        await ref.read(notesRepositoryProvider).restore(id);
      }
      await loadTrash();
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> permanentlyDeleteNotes(Iterable<String> ids) async {
    final targets = ids.toSet();
    if (targets.isEmpty) return;

    state = state.copyWith(loading: true, error: null);
    try {
      for (final id in targets) {
        await ref.read(notesRepositoryProvider).permanentDelete(id);
      }
      await loadTrash();
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> moveNotesToFolder(
    Iterable<String> ids,
    String folderId,
  ) async {
    final targets = ids.toSet();
    if (targets.isEmpty) return;

    final notesById = {
      for (final note in state.notes) note.id: note,
    };

    state = state.copyWith(loading: true, error: null);
    try {
      for (final id in targets) {
        final note = notesById[id];
        if (note == null) continue;
        await ref.read(notesRepositoryProvider).update(
              id: note.id,
              title: note.title,
              content: note.content,
              folderId: folderId,
            );
      }
      await reloadCurrent();
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> revokeShareLink(String id) async {
    state = state.copyWith(loading: true, error: null);
    try {
      await ref.read(notesRepositoryProvider).revokeShare(id);
      await loadShares();
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> createFolder(String name) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;

    state = state.copyWith(loading: true, error: null);
    try {
      await ref.read(foldersRepositoryProvider).createFolder(trimmed);
      await _loadWorkspace(
        currentView: NotesWorkspaceView.all,
        folderId: state.selectedFolderId,
        preserveSelectedNote: true,
      );
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<void> searchNotes(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) {
      await load(folderId: state.selectedFolderId);
      return;
    }

    state = state.copyWith(
      loading: true,
      error: null,
      currentView: NotesWorkspaceView.all,
      selectedNote: null,
      searchQuery: trimmed,
    );
    try {
      final folders = await _loadFolders();
      final notes = await ref.read(notesRepositoryProvider).search(trimmed);
      final stats = await _loadStats();
      state = state.copyWith(
        folders: folders,
        notes: notes,
        stats: stats,
        loading: false,
      );
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  void leaveEditorImmediately() {
    final targetView = state.currentView == NotesWorkspaceView.editor
        ? NotesWorkspaceView.all
        : state.currentView;
    state = state.copyWith(
      currentView: targetView == NotesWorkspaceView.editor
          ? NotesWorkspaceView.all
          : targetView,
      selectedNote: null,
      loading: false,
      error: null,
    );
    // Returning from the editor should feel instant. The editor owns saving;
    // keep the current board cache in place instead of kicking off a full
    // workspace reload during the transition.
  }

  Future<void> reloadCurrent() async {
    switch (state.currentView) {
      case NotesWorkspaceView.all:
        await _loadWorkspace(
          currentView: NotesWorkspaceView.all,
          folderId: state.selectedFolderId,
          preserveSelectedNote: true,
        );
        break;
      case NotesWorkspaceView.favorites:
        await _loadWorkspace(
          currentView: NotesWorkspaceView.favorites,
          preserveSelectedNote: true,
        );
        break;
      case NotesWorkspaceView.trash:
        await _loadWorkspace(
          currentView: NotesWorkspaceView.trash,
          preserveSelectedNote: true,
        );
        break;
      case NotesWorkspaceView.shares:
        await loadShares();
        break;
      case NotesWorkspaceView.settings:
      case NotesWorkspaceView.editor:
        break;
    }
  }

  Future<void> backToBoard() async {
    final fallbackView = state.currentView == NotesWorkspaceView.editor
        ? NotesWorkspaceView.all
        : state.currentView;
    if (fallbackView == NotesWorkspaceView.settings) {
      await _loadWorkspace(
        currentView: NotesWorkspaceView.all,
        folderId: state.selectedFolderId,
      );
      return;
    }
    await _loadWorkspace(
      currentView: fallbackView == NotesWorkspaceView.editor
          ? NotesWorkspaceView.all
          : fallbackView,
      folderId: state.selectedFolderId,
    );
  }

  Future<void> _loadWorkspace({
    required NotesWorkspaceView currentView,
    String? folderId,
    bool preserveSelectedNote = false,
  }) async {
    state = state.copyWith(
      loading: true,
      selectedFolderId: currentView == NotesWorkspaceView.all ? folderId : null,
      error: null,
      currentView: currentView,
      selectedNote: preserveSelectedNote ? state.selectedNote : null,
    );
    try {
      final folders = await _loadFolders();
      final notesRepository = ref.read(notesRepositoryProvider);
      final notes = switch (currentView) {
        NotesWorkspaceView.all =>
          await notesRepository.fetchAll(folderId: folderId),
        NotesWorkspaceView.favorites => await notesRepository.fetchFavorites(),
        NotesWorkspaceView.trash => await notesRepository.fetchTrash(),
        NotesWorkspaceView.shares ||
        NotesWorkspaceView.settings ||
        NotesWorkspaceView.editor =>
          const <NoteItem>[],
      };
      final stats = await _loadStats();
      state = state.copyWith(
        folders: folders,
        notes: notes,
        stats: stats,
        loading: false,
      );
    } catch (error) {
      state = state.copyWith(loading: false, error: error.toString());
    }
  }

  Future<Map<String, dynamic>> _loadStats() async {
    try {
      return await ref.read(notesRepositoryProvider).stats();
    } catch (_) {
      return state.stats;
    }
  }

  Future<List<FolderItem>> _loadFolders() async {
    try {
      return await ref.read(foldersRepositoryProvider).fetchFolders();
    } catch (_) {
      return state.folders;
    }
  }
}

final notesBoardViewModelProvider =
    StateNotifierProvider<NotesBoardViewModel, NotesBoardState>(
  (ref) => NotesBoardViewModel(ref),
);
