import 'package:mynote_android/core/storage/local_notes_storage.dart';
import 'package:mynote_android/domain/entities/note_item.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';

class OfflineNotesRepository implements NotesRepository {
  OfflineNotesRepository({
    required this.remote,
    required this.localStorage,
    required this.offlineMode,
    required this.setOfflineMode,
  });

  final NotesRepository remote;
  final LocalNotesStorage localStorage;
  final bool offlineMode;
  final Future<void> Function(bool value) setOfflineMode;

  @override
  Future<List<NoteItem>> fetchAll({String? folderId}) async {
    if (offlineMode) {
      final synced = await _trySyncPendingAndFetch(folderId: folderId);
      if (synced != null) return synced;
      return _localNotes(folderId: folderId);
    }

    try {
      await _syncPending();
      final notes = await remote.fetchAll(folderId: folderId);
      await localStorage.saveNotes(notes);
      return notes;
    } catch (_) {
      await setOfflineMode(true);
      rethrow;
    }
  }

  @override
  Future<NoteItem?> getById(String id) async {
    if (offlineMode) {
      return localStorage.readNote(id);
    }
    try {
      final note = await remote.getById(id);
      if (note != null) {
        await localStorage.upsertNote(note);
      }
      return note;
    } catch (_) {
      await setOfflineMode(true);
      return localStorage.readNote(id);
    }
  }

  @override
  Future<NoteItem> create({
    required String title,
    required String content,
    String? folderId,
  }) async {
    if (!offlineMode) {
      try {
        final note = await remote.create(
          title: title,
          content: content,
          folderId: folderId,
        );
        await localStorage.upsertNote(note);
        return note;
      } catch (_) {
        await setOfflineMode(true);
      }
    }

    final now = DateTime.now();
    final note = NoteItem(
      id: 'local-${now.microsecondsSinceEpoch}',
      title: title,
      content: content,
      folderId: folderId,
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    );
    await localStorage.upsertNote(note);
    await localStorage.addPendingOperation(
      PendingNoteOperation(type: 'create', note: note),
    );
    return note;
  }

  @override
  Future<NoteItem> update({
    required String id,
    required String title,
    required String content,
    String? folderId,
  }) async {
    if (!offlineMode) {
      try {
        final note = await remote.update(
          id: id,
          title: title,
          content: content,
          folderId: folderId,
        );
        await localStorage.upsertNote(note);
        return note;
      } catch (_) {
        await setOfflineMode(true);
      }
    }

    final existing = await localStorage.readNote(id);
    final note = NoteItem(
      id: id,
      title: title,
      content: content,
      folderId: folderId ?? existing?.folderId,
      isFavorite: existing?.isFavorite ?? false,
      isDeleted: existing?.isDeleted ?? false,
      isPinned: existing?.isPinned ?? false,
      createdAt: existing?.createdAt,
      updatedAt: DateTime.now(),
      color: existing?.color,
      shareToken: existing?.shareToken,
      sharedAt: existing?.sharedAt,
    );
    await localStorage.upsertNote(note);
    await localStorage.addPendingOperation(
      PendingNoteOperation(type: 'update', note: note),
    );
    return note;
  }

  @override
  Future<void> delete(String id) async {
    if (!offlineMode) {
      try {
        await remote.delete(id);
        await localStorage.removeNote(id);
        return;
      } catch (_) {
        await setOfflineMode(true);
      }
    }

    final existing = await localStorage.readNote(id);
    if (existing != null) {
      await localStorage.addPendingOperation(
        PendingNoteOperation(type: 'delete', note: existing),
      );
    }
    await localStorage.removeNote(id);
  }

  @override
  Future<List<NoteItem>> fetchFavorites() async {
    try {
      final notes = offlineMode
          ? (await _trySyncPendingAndFetch()) ?? await localStorage.readNotes()
          : await remote.fetchFavorites();
      if (!offlineMode) await localStorage.saveNotes(notes);
      return notes.where((note) => note.isFavorite).toList();
    } catch (_) {
      await setOfflineMode(true);
      final local = await localStorage.readNotes();
      return local.where((note) => note.isFavorite).toList();
    }
  }

  @override
  Future<List<NoteItem>> fetchTrash() async {
    if (offlineMode) {
      final local = await localStorage.readNotes();
      return local.where((note) => note.isDeleted).toList();
    }
    try {
      return await remote.fetchTrash();
    } catch (_) {
      await setOfflineMode(true);
      final local = await localStorage.readNotes();
      return local.where((note) => note.isDeleted).toList();
    }
  }

  @override
  Future<List<NoteItem>> search(String query) async {
    final local = offlineMode ? await localStorage.readNotes() : null;
    if (local != null) {
      return local.where((note) {
        return note.title.contains(query) || note.content.contains(query);
      }).toList();
    }
    return remote.search(query);
  }

  Future<List<NoteItem>?> _trySyncPendingAndFetch({String? folderId}) async {
    try {
      await _syncPending();
      final notes = await remote.fetchAll(folderId: folderId);
      await localStorage.saveNotes(notes);
      await setOfflineMode(false);
      return notes;
    } catch (_) {
      return null;
    }
  }

  Future<void> _syncPending() async {
    final operations = await localStorage.readPendingOperations();
    if (operations.isEmpty) return;

    for (final operation in operations) {
      switch (operation.type) {
        case 'create':
          await remote.create(
            title: operation.note.title,
            content: operation.note.content,
            folderId: operation.note.folderId,
          );
          break;
        case 'delete':
          await remote.delete(operation.note.id);
          break;
        case 'update':
        default:
          await remote.update(
            id: operation.note.id,
            title: operation.note.title,
            content: operation.note.content,
            folderId: operation.note.folderId,
          );
          break;
      }
    }
    await localStorage.savePendingOperations(const []);
  }

  Future<List<NoteItem>> _localNotes({String? folderId}) async {
    final notes = await localStorage.readNotes();
    if (folderId == null) {
      return notes.where((note) => !note.isDeleted).toList();
    }
    return notes
        .where((note) => !note.isDeleted && note.folderId == folderId)
        .toList();
  }

  @override
  Future<NoteItem> restore(String id) => remote.restore(id);

  @override
  Future<NoteItem> permanentDelete(String id) => remote.permanentDelete(id);

  @override
  Future<NoteItem> toggleFavorite(String id) => remote.toggleFavorite(id);

  @override
  Future<NoteItem> togglePin(String id) => remote.togglePin(id);

  @override
  Future<Map<String, dynamic>> stats() async {
    if (offlineMode) {
      final notes = await localStorage.readNotes();
      return {'totalNotes': notes.length};
    }
    return remote.stats();
  }

  @override
  Future<Map<String, dynamic>> share(String id) => remote.share(id);

  @override
  Future<Map<String, dynamic>> shareInfo(String id) => remote.shareInfo(id);

  @override
  Future<Map<String, dynamic>> revokeShare(String id) => remote.revokeShare(id);

  @override
  Future<List<Map<String, dynamic>>> getSharedLinks() =>
      offlineMode ? Future.value(const []) : remote.getSharedLinks();
}
