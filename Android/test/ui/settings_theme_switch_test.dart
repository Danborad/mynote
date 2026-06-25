import 'package:appflowy_editor/appflowy_editor.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/data/mappers/editor_html_mapper.dart';
import 'package:mynote_android/data/services/editor_autosave_service.dart';
import 'package:mynote_android/domain/entities/folder_item.dart';
import 'package:mynote_android/domain/entities/note_item.dart';
import 'package:mynote_android/domain/entities/user_profile.dart';
import 'package:mynote_android/domain/repositories/auth_repository.dart';
import 'package:mynote_android/domain/repositories/folders_repository.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';
import 'package:mynote_android/ui/viewmodels/notes_board_view_model.dart';
import 'package:mynote_android/ui/viewmodels/auth_view_model.dart';
import 'package:mynote_android/ui/views/notes/notes_board_view.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('drawer exposes theme switch options', (tester) async {
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    final autosave = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(_FakeNotesRepository()),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

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

    await _pumpShort(tester);

    await tester.tap(find.byIcon(Icons.menu).first);
    await _pumpShort(tester);

    final drawerRect = tester.getRect(find.byType(Drawer));
    expect(drawerRect.width, closeTo(252, 1));

    expect(find.text('存储空间'), findsOneWidget);
    expect(find.text('71.9 KB'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('设置'),
      200,
      scrollable: find.descendant(
        of: find.byKey(const Key('notes-drawer-scroll')),
        matching: find.byType(Scrollable),
      ),
    );
    await _pumpShort(tester);
    expect(find.text('设置'), findsWidgets);
    expect(find.byIcon(Icons.wb_sunny_outlined), findsOneWidget);
    expect(find.byIcon(Icons.dark_mode_outlined), findsOneWidget);
    expect(find.byIcon(Icons.devices_outlined), findsOneWidget);
  });

  testWidgets('light mode opens editor directly with editor widget',
      (tester) async {
    final autosave = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(_FakeNotesRepository()),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

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

    await _pumpShort(tester);

    await tester.tap(find.byIcon(Icons.menu).first);
    await _pumpShort(tester);
    await tester.scrollUntilVisible(
      find.byIcon(Icons.wb_sunny_outlined),
      200,
      scrollable: find.descendant(
        of: find.byKey(const Key('notes-drawer-scroll')),
        matching: find.byType(Scrollable),
      ),
    );
    await _pumpShort(tester);
    await tester.tap(find.byIcon(Icons.wb_sunny_outlined));
    await _pumpShort(tester);
    await tester.tapAt(const Offset(470, 120));
    await _pumpShort(tester);

    await container.read(notesBoardViewModelProvider.notifier).load();
    await _pumpShort(tester);
    await tester.tap(find.text('第一条笔记').first, warnIfMissed: false);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);
  });

  testWidgets('settings preference rows open edit dialog', (tester) async {
    final autosave = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(_FakeNotesRepository()),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    container.read(authViewModelProvider.notifier).debugSetProfile(
          const UserProfile(
            id: 'u1',
            username: 'tester',
            email: 'tester@example.com',
            isAdmin: false,
            trashRetentionDays: 15,
            shareRetentionDays: 30,
          ),
        );

    await _pumpShort(tester);
    container.read(notesBoardViewModelProvider.notifier).openSettings();
    await _pumpShort(tester);

    expect(find.text('账号信息'), findsOneWidget);
    expect(find.text('修改用户名'), findsOneWidget);
    expect(find.text('修改头像'), findsOneWidget);

    await tester.scrollUntilVisible(find.text('废纸篓清理'), 200);
    await _pumpShort(tester);
    await tester.tap(find.text('废纸篓清理'));
    await _pumpShort(tester);

    expect(find.byType(AlertDialog), findsOneWidget);
    expect(find.byType(CupertinoPicker), findsOneWidget);
    expect(find.text('15 天'), findsOneWidget);
    expect(find.text('保存'), findsOneWidget);
  });

  testWidgets('settings can switch note detail font size', (tester) async {
    final autosave = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(_FakeNotesRepository()),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

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
    container.read(notesBoardViewModelProvider.notifier).openSettings();
    await _pumpShort(tester);

    await tester.scrollUntilVisible(
      find.text('笔记字体大小'),
      200,
      scrollable: find
          .descendant(
            of: find.byType(NotesBoardView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await _pumpShort(tester);
    expect(find.text('中'), findsOneWidget);

    await tester.tap(find.text('笔记字体大小'));
    await _pumpShort(tester);

    expect(find.text('小'), findsOneWidget);
    expect(find.text('大'), findsOneWidget);

    await tester.tap(find.text('大'));
    await _pumpShort(tester);

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('note_detail_font_size'), 'large');
    expect(find.text('大'), findsOneWidget);
  });

  testWidgets('dark settings cards use dark surfaces', (tester) async {
    final autosave = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(_FakeNotesRepository()),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: MaterialApp(
          themeMode: ThemeMode.dark,
          darkTheme: ThemeData.dark(useMaterial3: true),
          localizationsDelegates: const [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: const NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    container.read(authViewModelProvider.notifier).debugSetProfile(
          const UserProfile(
            id: 'u1',
            username: 'tester',
            email: 'tester@example.com',
            isAdmin: false,
            trashRetentionDays: 15,
            shareRetentionDays: 30,
          ),
        );
    container.read(notesBoardViewModelProvider.notifier).openSettings();
    await _pumpShort(tester);

    final statCard = tester.widget<Container>(
      find
          .ancestor(
            of: find.text('笔记总数'),
            matching: find.byType(Container),
          )
          .first,
    );
    final statDecoration = statCard.decoration as BoxDecoration;
    expect(statDecoration.color, isNot(Colors.white));

    await tester.scrollUntilVisible(find.text('废纸篓清理'), 200);
    await _pumpShort(tester);
    final preferenceCard = tester.widget<Container>(
      find
          .ancestor(
            of: find.text('废纸篓清理'),
            matching: find.byType(Container),
          )
          .first,
    );
    final preferenceDecoration = preferenceCard.decoration as BoxDecoration;
    expect(preferenceDecoration.color, isNot(Colors.white));
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
  Future<void> register({
    required String username,
    required String password,
    required String captchaId,
    required String captchaText,
  }) async {}

  @override
  Future<String?> readToken() async => 'token';

  @override
  Future<UserProfile?> updateSettings({
    String? username,
    int? trashRetentionDays,
    int? shareRetentionDays,
  }) async =>
      null;

  @override
  Future<UserProfile?> uploadAvatar({
    required List<int> bytes,
    required String filename,
  }) async =>
      const UserProfile(
        id: 'u1',
        username: 'tester',
        email: 'tester@example.com',
        isAdmin: false,
        avatar: '/uploads/avatar.jpg',
      );

  @override
  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {}
}

class _FakeNotesRepository implements NotesRepository {
  @override
  Future<List<NoteItem>> fetchAll({String? folderId}) async => [
        NoteItem(
          id: 'n1',
          title: '第一条笔记',
          content: '<p>内容</p>',
          isFavorite: false,
          isDeleted: false,
          isPinned: false,
          updatedAt: DateTime(2026),
        ),
      ];

  @override
  Future<List<NoteItem>> fetchFavorites() async => const [];

  @override
  Future<List<NoteItem>> fetchTrash() async => const [];

  @override
  Future<List<NoteItem>> search(String query) async => const [];

  @override
  Future<NoteItem?> getById(String id) async => null;

  @override
  Future<NoteItem> create(
          {required String title,
          required String content,
          String? folderId}) async =>
      throw UnimplementedError();

  @override
  Future<NoteItem> update(
          {required String id,
          required String title,
          required String content,
          String? folderId}) async =>
      throw UnimplementedError();

  @override
  Future<void> delete(String id) async {}

  @override
  Future<NoteItem> restore(String id) async => throw UnimplementedError();

  @override
  Future<NoteItem> permanentDelete(String id) async =>
      throw UnimplementedError();

  @override
  Future<NoteItem> toggleFavorite(String id) async =>
      throw UnimplementedError();

  @override
  Future<NoteItem> togglePin(String id) async => throw UnimplementedError();

  @override
  Future<Map<String, dynamic>> stats() async => const {
        'totalNotes': 26,
        'favoritesCount': 4,
        'trashCount': 1,
        'totalStorageBytes': 73626,
      };

  @override
  Future<Map<String, dynamic>> share(String id) async => const {};

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
