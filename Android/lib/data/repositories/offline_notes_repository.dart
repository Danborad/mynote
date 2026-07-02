import 'package:dio/dio.dart';
import 'package:mynote_android/app/utils/note_preview.dart';
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
    } catch (error) {
      if (_shouldUseOffline(error)) {
        await setOfflineMode(true);
      }
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
    } catch (error) {
      if (_shouldUseOffline(error)) {
        await setOfflineMode(true);
        return localStorage.readNote(id);
      }
      rethrow;
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
      } catch (error) {
        if (!_shouldUseOffline(error)) {
          rethrow;
        }
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
      } catch (error) {
        if (!_shouldUseOffline(error)) {
          rethrow;
        }
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
      } catch (error) {
        if (!_shouldUseOffline(error)) {
          rethrow;
        }
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
    } catch (error) {
      if (!_shouldUseOffline(error)) {
        rethrow;
      }
      await setOfflineMode(true);
      final local = await localStorage.readNotes();
      return local.where((note) => note.isFavorite).toList();
    }
  }

  @override
  Future<List<NoteItem>> fetchTrash() async {
    if (offlineMode) {
      try {
        await _syncPending();
        final notes = await remote.fetchTrash();
        await setOfflineMode(false);
        return notes;
      } catch (error) {
        if (!_shouldUseOffline(error)) {
          rethrow;
        }
        final local = await localStorage.readNotes();
        return local.where((note) => note.isDeleted).toList();
      }
    }
    try {
      return await remote.fetchTrash();
    } catch (error) {
      if (!_shouldUseOffline(error)) {
        rethrow;
      }
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
    } catch (error) {
      if (!_shouldUseOffline(error)) {
        rethrow;
      }
      return null;
    }
  }

  Future<void> _syncPending() async {
    var operations = await localStorage.readPendingOperations();
    if (operations.isEmpty) return;

    final idMap = <String, String>{};
    while (operations.isNotEmpty) {
      final operation = _mapPendingOperationIds(operations.first, idMap);
      final unmappedLocalId = _isLocalRepositoryId(operation.note.id) &&
          !idMap.containsKey(operation.note.id);

      if (unmappedLocalId && operation.type != 'create') {
        if (operation.type != 'delete' && _hasMeaningfulNote(operation.note)) {
          final created = await remote.create(
            title: operation.note.title,
            content: operation.note.content,
            folderId: operation.note.folderId,
          );
          idMap[operation.note.id] = created.id;
          await localStorage.replaceNoteId(
            oldId: operation.note.id,
            note: created,
          );
        } else {
          await localStorage.removeNote(operation.note.id);
        }
      } else {
        switch (operation.type) {
          case 'create':
            if (!_hasMeaningfulNote(operation.note)) {
              await localStorage.removeNote(operation.note.id);
              break;
            }
            final created = await remote.create(
              title: operation.note.title,
              content: operation.note.content,
              folderId: operation.note.folderId,
            );
            idMap[operation.note.id] = created.id;
            await localStorage.replaceNoteId(
              oldId: operation.note.id,
              note: created,
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
      operations = operations
          .skip(1)
          .map((item) => _mapPendingOperationIds(item, idMap))
          .toList();
      await localStorage.savePendingOperations(operations);
    }
  }

  bool _isLocalRepositoryId(String id) => id.startsWith('local-');

  bool _hasMeaningfulNote(NoteItem note) {
    final preview = extractPreviewData(note.content);
    final title = note.title.trim();
    return preview.text.trim().isNotEmpty ||
        preview.image != null ||
        preview.audio ||
        preview.video ||
        (title.isNotEmpty && title != '新建笔记');
  }

  PendingNoteOperation _mapPendingOperationIds(
    PendingNoteOperation operation,
    Map<String, String> idMap,
  ) {
    final mappedId = idMap[operation.note.id];
    if (mappedId == null || mappedId == operation.note.id) {
      return operation;
    }
    return PendingNoteOperation(
      type: operation.type,
      note: _copyNoteWithId(operation.note, mappedId),
    );
  }

  NoteItem _copyNoteWithId(NoteItem note, String id) {
    return NoteItem(
      id: id,
      title: note.title,
      content: note.content,
      folderId: note.folderId,
      isFavorite: note.isFavorite,
      isDeleted: note.isDeleted,
      isPinned: note.isPinned,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      color: note.color,
      shareToken: note.shareToken,
      sharedAt: note.sharedAt,
    );
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
      try {
        await _syncPending();
        final stats = await remote.stats();
        await setOfflineMode(false);
        return stats;
      } catch (error) {
        if (!_shouldUseOffline(error)) {
          rethrow;
        }
        return _localStats();
      }
    }
    try {
      return await remote.stats();
    } catch (error) {
      if (!_shouldUseOffline(error)) {
        rethrow;
      }
      await setOfflineMode(true);
      return _localStats();
    }
  }

  @override
  Future<Map<String, dynamic>> share(String id) => remote.share(id);

  @override
  Future<Map<String, dynamic>> shareInfo(String id) => remote.shareInfo(id);

  @override
  Future<Map<String, dynamic>> revokeShare(String id) => remote.revokeShare(id);

  @override
  Future<List<Map<String, dynamic>>> getSharedLinks() => _getSharedLinks();

  Future<List<Map<String, dynamic>>> _getSharedLinks() async {
    if (offlineMode) {
      try {
        await _syncPending();
        final links = await remote.getSharedLinks();
        await setOfflineMode(false);
        return links;
      } catch (error) {
        if (!_shouldUseOffline(error)) {
          rethrow;
        }
        return const [];
      }
    }
    try {
      return await remote.getSharedLinks();
    } catch (error) {
      if (!_shouldUseOffline(error)) {
        rethrow;
      }
      await setOfflineMode(true);
      return const [];
    }
  }

  Future<Map<String, dynamic>> _localStats() async {
    final notes = await localStorage.readNotes();
    final active = notes.where((note) => !note.isDeleted).toList();
    final trash = notes.where((note) => note.isDeleted).toList();
    return {
      'totalNotes': active.length,
      'favoritesCount': active.where((note) => note.isFavorite).length,
      'pinnedCount': active.where((note) => note.isPinned).length,
      'trashCount': trash.length,
      'storageUsed': active.fold<int>(
        0,
        (sum, note) => sum + note.title.length + note.content.length,
      ),
    };
  }

  bool _shouldUseOffline(Object error) {
    if (error is DioException) {
      if (error.response != null) return false;
      return switch (error.type) {
        DioExceptionType.connectionTimeout ||
        DioExceptionType.sendTimeout ||
        DioExceptionType.receiveTimeout ||
        DioExceptionType.connectionError ||
        DioExceptionType.unknown =>
          true,
        DioExceptionType.badCertificate ||
        DioExceptionType.badResponse ||
        DioExceptionType.cancel =>
          false,
      };
    }
    return true;
  }
}
