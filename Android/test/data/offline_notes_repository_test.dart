import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mynote_android/core/storage/local_notes_storage.dart';
import 'package:mynote_android/data/repositories/offline_notes_repository.dart';
import 'package:mynote_android/domain/entities/note_item.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';

void main() {
  test('offline repository serves cached notes and syncs pending updates',
      () async {
    SharedPreferences.setMockInitialValues({});
    final storage = LocalNotesStorage();
    final remote = _FakeRemoteNotesRepository();
    final repository = OfflineNotesRepository(
      remote: remote,
      localStorage: storage,
      offlineMode: false,
      setOfflineMode: (_) async {},
    );

    final onlineNotes = await repository.fetchAll();
    expect(onlineNotes.single.title, '远程笔记');

    remote.fail = true;
    final failingRepository = OfflineNotesRepository(
      remote: remote,
      localStorage: storage,
      offlineMode: true,
      setOfflineMode: (_) async {},
    );

    final cachedNotes = await failingRepository.fetchAll();
    expect(cachedNotes.single.title, '远程笔记');

    final updated = await failingRepository.update(
      id: 'n1',
      title: '本地修改',
      content: '<p>本地内容</p>',
    );
    expect(updated.title, '本地修改');
    expect(await storage.pendingCount(), 1);

    remote.fail = false;
    final reconnectingRepository = OfflineNotesRepository(
      remote: remote,
      localStorage: storage,
      offlineMode: true,
      setOfflineMode: (_) async {},
    );

    final syncedNotes = await reconnectingRepository.fetchAll();
    expect(remote.updatedTitles, contains('本地修改'));
    expect(syncedNotes.single.title, '本地修改');
    expect(await storage.pendingCount(), 0);
  });
}

class _FakeRemoteNotesRepository implements NotesRepository {
  bool fail = false;
  final List<String> updatedTitles = [];
  NoteItem note = NoteItem(
    id: 'n1',
    title: '远程笔记',
    content: '<p>远程内容</p>',
    isFavorite: false,
    isDeleted: false,
    isPinned: false,
    updatedAt: DateTime(2026, 6, 24),
  );

  void _maybeFail() {
    if (fail) throw StateError('offline');
  }

  @override
  Future<List<NoteItem>> fetchAll({String? folderId}) async {
    _maybeFail();
    return [note];
  }

  @override
  Future<NoteItem?> getById(String id) async {
    _maybeFail();
    return note;
  }

  @override
  Future<NoteItem> update({
    required String id,
    required String title,
    required String content,
    String? folderId,
  }) async {
    _maybeFail();
    updatedTitles.add(title);
    note = NoteItem(
      id: id,
      title: title,
      content: content,
      folderId: folderId,
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026, 6, 24),
    );
    return note;
  }

  @override
  Future<NoteItem> create({
    required String title,
    required String content,
    String? folderId,
  }) async {
    _maybeFail();
    note = NoteItem(
      id: 'remote-new',
      title: title,
      content: content,
      folderId: folderId,
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026, 6, 24),
    );
    return note;
  }

  @override
  Future<void> delete(String id) async {
    _maybeFail();
  }

  @override
  Future<List<NoteItem>> fetchFavorites() async => fetchAll();
  @override
  Future<List<NoteItem>> fetchTrash() async => const [];
  @override
  Future<List<NoteItem>> search(String query) async => fetchAll();
  @override
  Future<NoteItem> restore(String id) async => note;
  @override
  Future<NoteItem> permanentDelete(String id) async => note;
  @override
  Future<NoteItem> toggleFavorite(String id) async => note;
  @override
  Future<NoteItem> togglePin(String id) async => note;
  @override
  Future<Map<String, dynamic>> stats() async => const {};
  @override
  Future<Map<String, dynamic>> share(String id) async => const {};
  @override
  Future<Map<String, dynamic>> shareInfo(String id) async => const {};
  @override
  Future<Map<String, dynamic>> revokeShare(String id) async => const {};
  @override
  Future<List<Map<String, dynamic>>> getSharedLinks() async => const [];
}
