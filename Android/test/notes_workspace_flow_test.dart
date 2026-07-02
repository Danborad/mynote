import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:appflowy_editor/appflowy_editor.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mynote_android/core/storage/server_settings_storage.dart';
import 'package:mynote_android/data/mappers/editor_html_mapper.dart';
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

import 'package:mynote_android/app/providers.dart';

void main() {
  testWidgets('notes workspace supports switching sections and opening editor',
      (tester) async {
    final authRepository = _FakeAuthRepository();
    final notesRepository = _FakeNotesRepository();
    final foldersRepository = _FakeFoldersRepository();
    final autosave = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(authRepository),
          notesRepositoryProvider.overrideWithValue(notesRepository),
          foldersRepositoryProvider.overrideWithValue(foldersRepository),
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

    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    expect(find.text('全部'), findsWidgets);
    expect(find.text('第一条笔记'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.menu).first);
    await tester.pumpAndSettle();

    await tester.tap(find.text('收藏夹').last);
    await tester.pumpAndSettle();
    expect(find.text('收藏笔记'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.menu).first);
    await tester.pumpAndSettle();
    await _scrollDrawerUntilVisible(tester, find.text('设置'));

    await tester.tap(find.text('设置').last);
    await tester.pumpAndSettle();
    expect(find.text('设置中心'), findsOneWidget);

    expect(find.text('存储空间'), findsOneWidget);
    expect(find.text('偏好设置'), findsOneWidget);

    await tester.tap(find.byTooltip('返回'));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.menu).first);
    await tester.pumpAndSettle();

    await tester.tap(find.text('全部笔记').last);
    await tester.pumpAndSettle();

    await tester.tap(find.text('第一条笔记'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);
    expect(find.byTooltip('更多'), findsOneWidget);
  });

  testWidgets('notes workspace supports share, trash and settings actions',
      (tester) async {
    final authRepository = _FakeAuthRepository();
    final notesRepository = _FakeNotesRepository();
    final foldersRepository = _FakeFoldersRepository();
    final autosave = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(authRepository),
          notesRepositoryProvider.overrideWithValue(notesRepository),
          foldersRepositoryProvider.overrideWithValue(foldersRepository),
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
            trashRetentionDays: 30,
            shareRetentionDays: 90,
          ),
        );

    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.menu).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('分享链接').last);
    await tester.pumpAndSettle();

    expect(find.text('生效中'), findsOneWidget);
    expect(find.textContaining('到期：'), findsOneWidget);
    expect(find.text('复制'), findsOneWidget);
    expect(find.text('关闭'), findsOneWidget);

    await tester.tap(find.text('复制'));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('分享链接已复制到剪贴板'), findsOneWidget);

    await tester.tap(find.text('关闭').first);
    await tester.pumpAndSettle();
    expect(notesRepository.revokedShareIds, contains('n1'));

    await tester.tap(find.byIcon(Icons.menu).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('废纸篓').last);
    await tester.pumpAndSettle();

    expect(find.text('废纸篓笔记'), findsOneWidget);
  });

  testWidgets('logout returns to login route instead of leaving stale notes',
      (tester) async {
    final authRepository = _FakeAuthRepository();
    final notesRepository = _FakeNotesRepository();
    final foldersRepository = _FakeFoldersRepository();
    final autosave = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));
    final router = GoRouter(
      initialLocation: '/notes',
      routes: [
        GoRoute(
          path: '/login',
          builder: (_, __) => const Scaffold(body: Text('login-screen')),
        ),
        GoRoute(
          path: '/notes',
          builder: (_, __) => const NotesBoardView(),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(authRepository),
          notesRepositoryProvider.overrideWithValue(notesRepository),
          foldersRepositoryProvider.overrideWithValue(foldersRepository),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
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

    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.menu).first);
    await tester.pumpAndSettle();
    await _scrollDrawerUntilVisible(tester, find.text('退出登录'));
    await tester.tap(find.text('退出登录'));
    await tester.pumpAndSettle();

    expect(authRepository.logoutCalled, isTrue);
    expect(find.text('login-screen'), findsOneWidget);
    expect(find.byType(NotesBoardView), findsNothing);
  });

  testWidgets('editor note actions and settings server entry work',
      (tester) async {
    SharedPreferences.setMockInitialValues({
      'server_base_url': ServerSettingsStorage.defaultBaseUrl,
    });

    final authRepository = _FakeAuthRepository();
    final notesRepository = _FakeNotesRepository();
    final foldersRepository = _FakeFoldersRepository();
    final autosave = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(authRepository),
          notesRepositoryProvider.overrideWithValue(notesRepository),
          foldersRepositoryProvider.overrideWithValue(foldersRepository),
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

    await tester.pumpAndSettle();

    await tester.tap(find.text('第一条笔记'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);
    expect(find.byTooltip('更多'), findsOneWidget);
  });

  testWidgets('home note card menu and cloud session entry work',
      (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final authRepository = _FakeAuthRepository();
    final notesRepository = _FakeNotesRepository();
    final foldersRepository = _FakeFoldersRepository();
    final autosave = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(authRepository),
          notesRepositoryProvider.overrideWithValue(notesRepository),
          foldersRepositoryProvider.overrideWithValue(foldersRepository),
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

    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.more_horiz).first);
    await tester.pumpAndSettle();

    expect(find.text('快捷操作'), findsOneWidget);
    expect(find.byKey(const Key('quick-actions-row')), findsOneWidget);
    expect(
      tester.getSize(find.byKey(const Key('quick-actions-row'))).height,
      lessThanOrEqualTo(64),
    );
    expect(find.text('收藏'), findsOneWidget);
    expect(find.text('图片分享'), findsOneWidget);
    expect(find.text('链接分享'), findsOneWidget);
    expect(find.text('加入分组'), findsOneWidget);
    expect(find.text('删除'), findsOneWidget);
    expect(find.text('分享笔记'), findsNothing);
    expect(
      tester.getTopLeft(find.text('删除')).dy,
      tester.getTopLeft(find.text('收藏')).dy,
    );
    expect(
      tester.getTopLeft(find.text('加入分组')).dy,
      tester.getTopLeft(find.text('收藏')).dy,
    );
    expect(
      tester.getTopRight(find.text('删除')).dx,
      lessThanOrEqualTo(tester.getTopRight(find.text('快捷操作')).dx + 320),
    );

    await tester.tap(find.text('链接分享'));
    await tester.pump(const Duration(milliseconds: 100));
    expect(notesRepository.sharedIds, contains('n1'));
    expect(find.text('分享链接已复制到剪贴板'), findsOneWidget);

    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.more_horiz).first);
    await tester.pumpAndSettle();

    await tester.tap(find.text('加入分组'));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('folder-picker-f1')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('folder-picker-f1')));
    await tester.pumpAndSettle();

    expect(notesRepository.updatedFolderIds, contains('f1'));
  });

  testWidgets('editor more actions can move the note into a folder',
      (tester) async {
    final authRepository = _FakeAuthRepository();
    final notesRepository = _FakeNotesRepository();
    final foldersRepository = _FakeFoldersRepository();
    final autosave = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(authRepository),
          notesRepositoryProvider.overrideWithValue(notesRepository),
          foldersRepositoryProvider.overrideWithValue(foldersRepository),
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

    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    await tester.tap(find.text('第一条笔记'));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('更多'));
    await tester.pumpAndSettle();

    expect(find.text('加入分组'), findsOneWidget);

    await tester.tap(find.text('加入分组'));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('folder-picker-f1')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('folder-picker-f1')));
    await tester.pumpAndSettle();

    expect(notesRepository.updatedFolderIds, contains('f1'));
  });
}

Future<void> _scrollDrawerUntilVisible(
  WidgetTester tester,
  Finder finder,
) async {
  await tester.scrollUntilVisible(
    finder,
    200,
    scrollable: find.descendant(
      of: find.byKey(const Key('notes-drawer-scroll')),
      matching: find.byType(Scrollable),
    ),
  );
  await tester.pumpAndSettle();
}

class _FakeAuthRepository implements AuthRepository {
  int? updatedTrashRetentionDays;
  int? updatedShareRetentionDays;
  String? changedOldPassword;
  String? changedNewPassword;
  bool logoutCalled = false;

  @override
  Future<UserProfile?> getProfile() async => const UserProfile(
        id: 'u1',
        username: 'tester',
        email: 'tester@example.com',
        isAdmin: false,
      );

  @override
  Future<Map<String, dynamic>> getCaptcha() async => const {
        'id': 'captcha-test',
        'image': '<svg></svg>',
      };

  @override
  Future<void> login(
      {required String username, required String password}) async {}

  @override
  Future<void> register({
    required String username,
    required String password,
    required String captchaId,
    required String captchaText,
  }) async {}

  @override
  Future<void> logout() async {
    logoutCalled = true;
  }

  @override
  Future<String?> readToken() async => 'token';

  @override
  Future<UserProfile?> updateSettings({
    String? username,
    int? trashRetentionDays,
    int? shareRetentionDays,
  }) async {
    updatedTrashRetentionDays = trashRetentionDays;
    updatedShareRetentionDays = shareRetentionDays;
    return UserProfile(
      id: 'u1',
      username: username ?? 'tester',
      email: 'tester@example.com',
      isAdmin: false,
      trashRetentionDays: trashRetentionDays ?? 30,
      shareRetentionDays: shareRetentionDays ?? 30,
    );
  }

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
  }) async {
    changedOldPassword = oldPassword;
    changedNewPassword = newPassword;
  }
}

class _FakeFoldersRepository implements FoldersRepository {
  @override
  Future<FolderItem> createFolder(String name) async =>
      FolderItem(id: 'f2', name: name);

  @override
  Future<List<FolderItem>> fetchFolders() async => const [
        FolderItem(id: 'f1', name: '工作'),
      ];
}

class _FakeNotesRepository implements NotesRepository {
  final List<String> revokedShareIds = [];
  final List<String> restoredIds = [];
  final List<String> favoritedIds = [];
  final List<String> pinnedIds = [];
  final List<String> deletedIds = [];
  final List<String> sharedIds = [];
  final List<String?> updatedFolderIds = [];

  @override
  Future<NoteItem> create({
    required String title,
    required String content,
    String? folderId,
  }) async {
    return NoteItem(
      id: 'n2',
      title: title,
      content: content,
      folderId: folderId,
      isFavorite: false,
      isPinned: false,
      isDeleted: false,
      updatedAt: DateTime(2026, 4, 14),
      createdAt: DateTime(2026, 4, 14),
    );
  }

  @override
  Future<void> delete(String id) async {
    deletedIds.add(id);
  }

  @override
  Future<List<NoteItem>> fetchAll({String? folderId}) async => [
        NoteItem(
          id: 'n1',
          title: '第一条笔记',
          content: '<p>测试内容</p>',
          folderId: 'f1',
          isFavorite: false,
          isPinned: false,
          isDeleted: false,
          updatedAt: DateTime(2026, 4, 14),
          createdAt: DateTime(2026, 4, 14),
        ),
      ];

  @override
  Future<List<NoteItem>> fetchFavorites() async => [
        NoteItem(
          id: 'n3',
          title: '收藏笔记',
          content: '<p>收藏内容</p>',
          isFavorite: true,
          isPinned: false,
          isDeleted: false,
          updatedAt: DateTime(2026, 4, 14),
          createdAt: DateTime(2026, 4, 14),
        ),
      ];

  @override
  Future<NoteItem?> getById(String id) async => NoteItem(
        id: id,
        title: '第一条笔记',
        content: '<p>测试内容</p>',
        isFavorite: false,
        isPinned: false,
        isDeleted: false,
        updatedAt: DateTime(2026, 4, 14),
        createdAt: DateTime(2026, 4, 14),
      );

  @override
  Future<List<Map<String, dynamic>>> getSharedLinks() async => const [
        {
          'id': 'n1',
          'title': '第一条笔记',
          'shareUrl': 'http://test/share/1',
          'expiresAt': '2026-04-30T10:00:00.000Z'
        }
      ];

  @override
  Future<NoteItem> permanentDelete(String id) async =>
      throw UnimplementedError();

  @override
  Future<NoteItem> restore(String id) async {
    restoredIds.add(id);
    return NoteItem(
      id: id,
      title: '废纸篓笔记',
      content: '<p>已恢复</p>',
      isFavorite: false,
      isPinned: false,
      isDeleted: false,
      updatedAt: DateTime(2026, 4, 14),
      createdAt: DateTime(2026, 4, 10),
    );
  }

  @override
  Future<List<NoteItem>> search(String query) async => const [];

  @override
  Future<Map<String, dynamic>> share(String id) async {
    sharedIds.add(id);
    return const {
      'enabled': true,
      'shareUrl': 'http://test/share/1',
    };
  }

  @override
  Future<Map<String, dynamic>> shareInfo(String id) async => const {
        'enabled': true,
        'shareUrl': 'http://test/share/1',
      };

  @override
  Future<Map<String, dynamic>> stats() async => const {
        'totalNotes': 1,
        'favoritesCount': 1,
        'pinnedCount': 0,
        'trashCount': 0,
      };

  @override
  Future<NoteItem> toggleFavorite(String id) async =>
      _toggleRecord(id, favoritedIds);

  @override
  Future<NoteItem> togglePin(String id) async => _toggleRecord(id, pinnedIds);

  @override
  Future<NoteItem> update({
    required String id,
    required String title,
    required String content,
    String? folderId,
  }) async {
    updatedFolderIds.add(folderId);
    return NoteItem(
      id: id,
      title: title,
      content: content,
      folderId: folderId,
      isFavorite: false,
      isPinned: false,
      isDeleted: false,
      updatedAt: DateTime(2026, 4, 14),
      createdAt: DateTime(2026, 4, 14),
    );
  }

  @override
  Future<Map<String, dynamic>> revokeShare(String id) async {
    revokedShareIds.add(id);
    return const {
      'enabled': false,
    };
  }

  NoteItem _toggleRecord(String id, List<String> target) {
    target.add(id);
    return NoteItem(
      id: id,
      title: '第一条笔记',
      content: '<p>测试内容</p>',
      isFavorite: target == favoritedIds,
      isPinned: target == pinnedIds,
      isDeleted: false,
      updatedAt: DateTime(2026, 4, 14),
      createdAt: DateTime(2026, 4, 14),
    );
  }

  @override
  Future<List<NoteItem>> fetchTrash() async => [
        NoteItem(
          id: 'trash-1',
          title: '废纸篓笔记',
          content: '<p>待恢复内容</p>',
          isFavorite: false,
          isPinned: false,
          isDeleted: true,
          updatedAt: DateTime(2026, 4, 14),
          createdAt: DateTime(2026, 4, 10),
        ),
      ];
}
