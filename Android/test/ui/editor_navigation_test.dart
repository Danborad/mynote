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
import 'package:mynote_android/ui/views/editor/editor_view.dart';
import 'package:mynote_android/ui/views/notes/notes_board_view.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('notes board navigates to editor route', (tester) async {
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

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    router.go('/notes');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

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

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('第一条笔记'), findsOneWidget);

    await tester.tap(find.text('第一条笔记'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);
    expect(find.byTooltip('更多'), findsOneWidget);
  });

  testWidgets('new draft back button returns to notes board once',
      (tester) async {
    final router = createAppRouter();
    final notesRepository = _FakeNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(notesRepository),
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

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    router.go('/notes');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

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
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    await tester.tap(find.byTooltip('新建笔记'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);

    await tester.tap(find.byTooltip('返回'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.byKey(const Key('appflowy-editor-widget')), findsNothing);
    expect(find.byTooltip('新建笔记'), findsOneWidget);
    expect(find.text('新建笔记'), findsOneWidget);
    expect(find.text('第一条笔记'), findsOneWidget);
    expect(notesRepository.fetchAllCount, greaterThanOrEqualTo(2));
  });

  testWidgets('android system back from editor returns to notes board',
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

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    router.go('/notes');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

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
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    await tester.tap(find.text('第一条笔记'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);

    await tester.binding.handlePopRoute();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.byKey(const Key('appflowy-editor-widget')), findsNothing);
    expect(find.byTooltip('新建笔记'), findsOneWidget);
    expect(find.text('第一条笔记'), findsOneWidget);
  });

  testWidgets('EditorView shows editor immediately when noteId changes',
      (tester) async {
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesRepositoryProvider
              .overrideWithValue(_FakeEditorNavigationNotesRepository()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: _EditorViewHarness(),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);

    await tester.tap(find.text('切换笔记'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);
  });

  testWidgets('EditorView applies the saved large note font size',
      (tester) async {
    SharedPreferences.setMockInitialValues({
      'note_detail_font_size': 'large',
    });
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesRepositoryProvider
              .overrideWithValue(_FakeEditorNavigationNotesRepository()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: EditorView(noteId: 'n1'),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    final editor = tester.widget<AppFlowyEditor>(
        find.byKey(const Key('appflowy-editor-widget')));
    expect(editor.editorStyle.textScaleFactor, 0.96);
  });
}

class _EditorViewHarness extends StatefulWidget {
  const _EditorViewHarness();

  @override
  State<_EditorViewHarness> createState() => _EditorViewHarnessState();
}

class _EditorViewHarnessState extends State<_EditorViewHarness> {
  String _noteId = 'n1';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          TextButton(
            onPressed: () => setState(() => _noteId = 'n2'),
            child: const Text('切换笔记'),
          ),
          Expanded(
            child: EditorView(noteId: _noteId),
          ),
        ],
      ),
    );
  }
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
  int fetchAllCount = 0;

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
  Future<List<NoteItem>> fetchAll({String? folderId}) async {
    fetchAllCount += 1;
    return _notes;
  }

  @override
  Future<List<NoteItem>> fetchFavorites() async => _notes;
  @override
  Future<List<NoteItem>> fetchTrash() async => const [];
  @override
  Future<List<NoteItem>> search(String query) async => _notes;
  @override
  Future<NoteItem?> getById(String id) async => _notes.first;
  @override
  Future<NoteItem> create({
    required String title,
    required String content,
    String? folderId,
  }) async {
    _notes.insert(
      0,
      NoteItem(
        id: 'new-draft',
        title: title,
        content: content,
        folderId: folderId,
        isFavorite: false,
        isDeleted: false,
        isPinned: false,
        updatedAt: DateTime(2026),
      ),
    );
    return _notes.first;
  }

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

class _FakeEditorNavigationNotesRepository implements NotesRepository {
  final Map<String, NoteItem> _notes = {
    'n1': NoteItem(
      id: 'n1',
      title: '第一篇',
      content: '<p>第一篇第一段</p><p>第一篇第二段</p>',
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026),
    ),
    'n2': NoteItem(
      id: 'n2',
      title: '第二篇',
      content: '<p>第二篇第一段</p><p>第二篇第二段</p>',
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026),
    ),
  };

  @override
  Future<NoteItem?> getById(String id) async => _notes[id];

  @override
  Future<NoteItem> update({
    required String id,
    required String title,
    required String content,
    String? folderId,
  }) async {
    final updated = NoteItem(
      id: id,
      title: title,
      content: content,
      folderId: folderId,
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026),
    );
    _notes[id] = updated;
    return updated;
  }

  @override
  Future<NoteItem> create({
    required String title,
    required String content,
    String? folderId,
  }) async =>
      throw UnimplementedError();

  @override
  Future<void> delete(String id) async {}

  @override
  Future<List<NoteItem>> fetchAll({String? folderId}) async =>
      _notes.values.toList();

  @override
  Future<List<NoteItem>> fetchFavorites() async => const [];

  @override
  Future<List<NoteItem>> fetchTrash() async => const [];

  @override
  Future<List<Map<String, dynamic>>> getSharedLinks() async => const [];

  @override
  Future<NoteItem> permanentDelete(String id) async =>
      throw UnimplementedError();

  @override
  Future<NoteItem> restore(String id) async => throw UnimplementedError();

  @override
  Future<Map<String, dynamic>> revokeShare(String id) async => const {};

  @override
  Future<List<NoteItem>> search(String query) async => const [];

  @override
  Future<Map<String, dynamic>> share(String id) async => const {};

  @override
  Future<Map<String, dynamic>> shareInfo(String id) async => const {};

  @override
  Future<Map<String, dynamic>> stats() async => const {};

  @override
  Future<NoteItem> toggleFavorite(String id) async =>
      throw UnimplementedError();

  @override
  Future<NoteItem> togglePin(String id) async => throw UnimplementedError();
}
