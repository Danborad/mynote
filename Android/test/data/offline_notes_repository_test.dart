import 'package:dio/dio.dart';
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

  test('offline create followed by update syncs with the remote id', () async {
    SharedPreferences.setMockInitialValues({});
    final storage = LocalNotesStorage();
    final remote = _FakeRemoteNotesRepository();

    final offlineRepository = OfflineNotesRepository(
      remote: remote,
      localStorage: storage,
      offlineMode: true,
      setOfflineMode: (_) async {},
    );

    final local = await offlineRepository.create(
      title: '本地草稿',
      content: '',
    );
    expect(local.id, startsWith('local-'));

    await offlineRepository.update(
      id: local.id,
      title: '本地草稿已编辑',
      content: '<p>本地内容</p>',
    );
    expect(await storage.pendingCount(), 2);

    final reconnectingRepository = OfflineNotesRepository(
      remote: remote,
      localStorage: storage,
      offlineMode: true,
      setOfflineMode: (_) async {},
    );

    final syncedNotes = await reconnectingRepository.fetchAll();

    expect(remote.createdTitles, ['本地草稿']);
    expect(remote.updatedIds, ['remote-new']);
    expect(remote.updatedTitles, contains('本地草稿已编辑'));
    expect(syncedNotes.single.id, 'remote-new');
    expect(syncedNotes.single.title, '本地草稿已编辑');
    expect(await storage.pendingCount(), 0);
    expect((await storage.readNotes()).any((note) => note.id == local.id),
        isFalse);
  });

  test('legacy local update without create is synced as a create', () async {
    SharedPreferences.setMockInitialValues({});
    final storage = LocalNotesStorage();
    final remote = _FakeRemoteNotesRepository();
    final localNote = NoteItem(
      id: 'local-legacy',
      title: '旧本地笔记',
      content: '<p>旧本地内容</p>',
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026, 7, 2),
    );
    await storage.upsertNote(localNote);
    await storage.addPendingOperation(
      PendingNoteOperation(type: 'update', note: localNote),
    );

    final repository = OfflineNotesRepository(
      remote: remote,
      localStorage: storage,
      offlineMode: true,
      setOfflineMode: (_) async {},
    );

    await repository.fetchAll();

    expect(remote.createdTitles, ['旧本地笔记']);
    expect(remote.updatedIds, isEmpty);
    expect(await storage.pendingCount(), 0);
    expect((await storage.readNotes()).any((note) => note.id == 'local-legacy'),
        isFalse);
  });

  test('untouched local drafts are not synced as remote notes', () async {
    SharedPreferences.setMockInitialValues({});
    final storage = LocalNotesStorage();
    final remote = _FakeRemoteNotesRepository();
    final draft = NoteItem(
      id: 'local-empty-draft',
      title: '新建笔记',
      content: '',
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026, 7, 2),
    );
    await storage.upsertNote(draft);
    await storage.addPendingOperation(
      PendingNoteOperation(type: 'create', note: draft),
    );

    final repository = OfflineNotesRepository(
      remote: remote,
      localStorage: storage,
      offlineMode: true,
      setOfflineMode: (_) async {},
    );

    await repository.fetchAll();

    expect(remote.createdTitles, isEmpty);
    expect(await storage.pendingCount(), 0);
    expect(
      (await storage.readNotes()).any((note) => note.id == 'local-empty-draft'),
      isFalse,
    );
  });

  test('untouched draft create followed by content update syncs once',
      () async {
    SharedPreferences.setMockInitialValues({});
    final storage = LocalNotesStorage();
    final remote = _FakeRemoteNotesRepository();
    final draft = NoteItem(
      id: 'local-draft-then-edit',
      title: '新建笔记',
      content: '',
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026, 7, 2),
    );
    final edited = NoteItem(
      id: draft.id,
      title: '真正内容',
      content: '<p>真正内容</p>',
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026, 7, 2, 1),
    );
    await storage.upsertNote(edited);
    await storage.addPendingOperation(
      PendingNoteOperation(type: 'create', note: draft),
    );
    await storage.addPendingOperation(
      PendingNoteOperation(type: 'update', note: edited),
    );

    final repository = OfflineNotesRepository(
      remote: remote,
      localStorage: storage,
      offlineMode: true,
      setOfflineMode: (_) async {},
    );

    await repository.fetchAll();

    expect(remote.createdTitles, ['真正内容']);
    expect(remote.updatedIds, isEmpty);
    expect(await storage.pendingCount(), 0);
  });

  test('http 404 does not switch the repository into offline mode', () async {
    SharedPreferences.setMockInitialValues({});
    final storage = LocalNotesStorage();
    final remote = _FakeRemoteNotesRepository()
      ..nextError = DioException(
        requestOptions: RequestOptions(path: '/notes'),
        response: Response(
          requestOptions: RequestOptions(path: '/notes'),
          statusCode: 404,
        ),
        type: DioExceptionType.badResponse,
      );
    final offlineStates = <bool>[];
    final repository = OfflineNotesRepository(
      remote: remote,
      localStorage: storage,
      offlineMode: false,
      setOfflineMode: (value) async => offlineStates.add(value),
    );

    await expectLater(repository.fetchAll(), throwsA(isA<DioException>()));

    expect(offlineStates, isEmpty);
  });

  test('offline mode still uses remote stats and shared links after reconnect',
      () async {
    SharedPreferences.setMockInitialValues({});
    final storage = LocalNotesStorage();
    final remote = _FakeRemoteNotesRepository()
      ..remoteStats = const {
        'totalNotes': 40,
        'favoritesCount': 5,
        'trashCount': 16,
        'storageUsed': 19451084,
      }
      ..remoteSharedLinks = const [
        {'id': 's1', 'shareUrl': 'https://notes.example.com/share/s1'},
      ];
    final offlineStates = <bool>[];
    final repository = OfflineNotesRepository(
      remote: remote,
      localStorage: storage,
      offlineMode: true,
      setOfflineMode: (value) async => offlineStates.add(value),
    );

    expect(await repository.stats(), remote.remoteStats);
    expect(await repository.getSharedLinks(), remote.remoteSharedLinks);
    expect(offlineStates, contains(false));
  });

  test('offline fetch rethrows http 404 instead of using stale cache',
      () async {
    SharedPreferences.setMockInitialValues({});
    final storage = LocalNotesStorage();
    final remote = _FakeRemoteNotesRepository()
      ..nextError = DioException(
        requestOptions: RequestOptions(path: '/notes'),
        response: Response(
          requestOptions: RequestOptions(path: '/notes'),
          statusCode: 404,
        ),
        type: DioExceptionType.badResponse,
      );
    final repository = OfflineNotesRepository(
      remote: remote,
      localStorage: storage,
      offlineMode: true,
      setOfflineMode: (_) async {},
    );

    await expectLater(repository.fetchAll(), throwsA(isA<DioException>()));
  });

  test('offline trash reloads remote trash after reconnect', () async {
    SharedPreferences.setMockInitialValues({});
    final storage = LocalNotesStorage();
    final remote = _FakeRemoteNotesRepository()
      ..remoteTrash = [
        NoteItem(
          id: 'trash-remote',
          title: '远端废纸篓',
          content: '',
          isFavorite: false,
          isDeleted: true,
          isPinned: false,
          updatedAt: DateTime(2026, 7, 2),
        ),
      ];
    final offlineStates = <bool>[];
    final repository = OfflineNotesRepository(
      remote: remote,
      localStorage: storage,
      offlineMode: true,
      setOfflineMode: (value) async => offlineStates.add(value),
    );

    final trash = await repository.fetchTrash();

    expect(trash.single.id, 'trash-remote');
    expect(offlineStates, contains(false));
  });
}

class _FakeRemoteNotesRepository implements NotesRepository {
  bool fail = false;
  Object? nextError;
  Map<String, dynamic> remoteStats = const {};
  List<Map<String, dynamic>> remoteSharedLinks = const [];
  List<NoteItem> remoteTrash = const [];
  final List<String> createdTitles = [];
  final List<String> updatedIds = [];
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
    final error = nextError;
    if (error != null) {
      nextError = null;
      throw error;
    }
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
    updatedIds.add(id);
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
    createdTitles.add(title);
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
  Future<List<NoteItem>> fetchTrash() async {
    _maybeFail();
    return remoteTrash;
  }

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
  Future<Map<String, dynamic>> stats() async {
    _maybeFail();
    return remoteStats;
  }

  @override
  Future<Map<String, dynamic>> share(String id) async => const {};
  @override
  Future<Map<String, dynamic>> shareInfo(String id) async => const {};
  @override
  Future<Map<String, dynamic>> revokeShare(String id) async => const {};
  @override
  Future<List<Map<String, dynamic>>> getSharedLinks() async {
    _maybeFail();
    return remoteSharedLinks;
  }
}
