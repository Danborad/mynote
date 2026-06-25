import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:appflowy_editor/appflowy_editor.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/app/router/app_router.dart';
import 'package:mynote_android/data/services/editor_autosave_service.dart';
import 'package:mynote_android/domain/entities/folder_item.dart';
import 'package:mynote_android/domain/entities/note_item.dart';
import 'package:mynote_android/domain/entities/user_profile.dart';
import 'package:mynote_android/domain/repositories/auth_repository.dart';
import 'package:mynote_android/domain/repositories/folders_repository.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';
import 'package:mynote_android/ui/viewmodels/auth_view_model.dart';
import 'package:mynote_android/ui/viewmodels/notes_board_view_model.dart';
import 'package:mynote_android/ui/views/notes/notes_board_view.dart';

void main() {
  testWidgets('notes board only renders list controls and routes to editor',
      (tester) async {
    final router = createAppRouter();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(_FakeNotesRepository()),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: MaterialApp.router(
          routerConfig: router,
          localizationsDelegates: const [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
        ),
      ),
    );

    router.go('/notes');
    await _pumpShort(tester);

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    container.read(authViewModelProvider.notifier).debugSetProfile(
          const UserProfile(
            id: 'u1',
            username: 'tester',
            email: 'tester@example.com',
            isAdmin: false,
          ),
        );

    await container.read(notesBoardViewModelProvider.notifier).load();
    await _pumpShort(tester);

    expect(find.byKey(const Key('appflowy-editor-widget')), findsNothing);
    expect(find.byTooltip('新建笔记'), findsOneWidget);
    expect(find.byIcon(Icons.menu), findsOneWidget);
    expect(find.text('第一条笔记'), findsOneWidget);

    await tester.tap(find.text('第一条笔记').first);
    await _pumpShort(tester);
    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);

    router.go('/notes');
    await container.read(notesBoardViewModelProvider.notifier).backToBoard();
    await _pumpShort(tester);

    await tester.tap(find.byTooltip('新建笔记'));
    await _pumpShort(tester);
    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);
  });
}

Future<void> _pumpShort(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 350));
}

class _FakeAuthRepository implements AuthRepository {
  @override
  Future<UserProfile?> getProfile() async => const UserProfile(
        id: 'u1',
        username: 'tester',
        email: 'tester@example.com',
        isAdmin: false,
      );
  @override
  Future<Map<String, dynamic>> getCaptcha() async =>
      const {'id': 'c', 'image': ''};
  @override
  Future<void> login(
      {required String username, required String password}) async {}
  @override
  Future<void> logout() async {}
  @override
  Future<void> register(
      {required String username,
      required String password,
      required String captchaId,
      required String captchaText}) async {}
  @override
  Future<String?> readToken() async => 'token';
  @override
  Future<UserProfile?> updateSettings(
          {String? username,
          int? trashRetentionDays,
          int? shareRetentionDays}) async =>
      null;

  @override
  Future<UserProfile?> uploadAvatar({
    required List<int> bytes,
    required String filename,
  }) async =>
      null;

  @override
  Future<void> changePassword(
      {required String oldPassword, required String newPassword}) async {}
}

class _FakeNotesRepository implements NotesRepository {
  final List<NoteItem> _notes = [
    NoteItem(
      id: 'n1',
      title: '第一条笔记',
      content: '<p>内容</p>',
      folderId: 'f1',
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026),
    ),
  ];

  @override
  Future<List<NoteItem>> fetchAll({String? folderId}) async => _notes;
  @override
  Future<List<NoteItem>> fetchFavorites() async => _notes;
  @override
  Future<List<NoteItem>> fetchTrash() async => const [];
  @override
  Future<List<NoteItem>> search(String query) async => _notes;
  @override
  Future<NoteItem?> getById(String id) async => _notes.first;
  @override
  Future<NoteItem> create(
          {required String title,
          required String content,
          String? folderId}) async =>
      NoteItem(
        id: 'new-draft',
        title: title,
        content: content,
        folderId: folderId,
        isFavorite: false,
        isDeleted: false,
        isPinned: false,
        updatedAt: DateTime(2026),
      );
  @override
  Future<NoteItem> update(
          {required String id,
          required String title,
          required String content,
          String? folderId}) async =>
      _notes.first;
  @override
  Future<void> delete(String id) async {}
  @override
  Future<NoteItem> restore(String id) async => _notes.first;
  @override
  Future<NoteItem> permanentDelete(String id) async => _notes.first;
  @override
  Future<NoteItem> toggleFavorite(String id) async => _notes.first;
  @override
  Future<NoteItem> togglePin(String id) async => _notes.first;
  @override
  Future<Map<String, dynamic>> stats() async => const {};
  @override
  Future<Map<String, dynamic>> share(String id) async =>
      const {'shareUrl': 'url'};
  @override
  Future<Map<String, dynamic>> shareInfo(String id) async => const {};
  @override
  Future<Map<String, dynamic>> revokeShare(String id) async => const {};
  @override
  Future<List<Map<String, dynamic>>> getSharedLinks() async => const [];
}

class _FakeFoldersRepository implements FoldersRepository {
  @override
  Future<List<FolderItem>> fetchFolders() async => const [];
  @override
  Future<FolderItem> createFolder(String name) async =>
      FolderItem(id: 'f1', name: name);
}
