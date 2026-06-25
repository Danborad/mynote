import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/core/storage/server_settings_storage.dart';
import 'package:mynote_android/core/storage/token_storage.dart';
import 'package:mynote_android/domain/entities/folder_item.dart';
import 'package:mynote_android/domain/entities/note_item.dart';
import 'package:mynote_android/domain/repositories/auth_repository.dart';
import 'package:mynote_android/domain/repositories/folders_repository.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';
import 'package:mynote_android/ui/views/auth/login_view.dart';
import 'package:mynote_android/ui/views/notes/notes_board_view.dart';
import 'package:mynote_android/ui/viewmodels/auth_view_model.dart';
import 'package:mynote_android/domain/entities/user_profile.dart';

void main() {
  test('TokenStorage reads persisted token fallback', () async {
    SharedPreferences.setMockInitialValues({
      'auth_token': 'persisted-token',
    });

    final storage = TokenStorage();
    expect(await storage.readToken(), 'persisted-token');
  });

  testWidgets('LoginView restores remembered credentials', (tester) async {
    SharedPreferences.setMockInitialValues({
      'server_base_url': ServerSettingsStorage.defaultBaseUrl,
      'saved_username': 'remembered-user',
      'saved_password': 'remembered-pass',
    });

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: LoginView()),
      ),
    );
    await tester.pumpAndSettle();

    final usernameField = tester.widget<TextFormField>(
      find.widgetWithText(TextFormField, '用户名'),
    );
    final passwordField = tester.widget<TextFormField>(
      find.widgetWithText(TextFormField, '密码'),
    );

    expect(usernameField.controller?.text, 'remembered-user');
    expect(passwordField.controller?.text, 'remembered-pass');
  });

  testWidgets('NotesBoardView uses compact folder tabs and note cards',
      (tester) async {
    final authRepository = _LayoutAuthRepository();
    final notesRepository = _LayoutNotesRepository();
    final foldersRepository = _LayoutFoldersRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(authRepository),
          notesRepositoryProvider.overrideWithValue(notesRepository),
          foldersRepositoryProvider.overrideWithValue(foldersRepository),
        ],
        child: const MaterialApp(home: NotesBoardView()),
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

    expect(find.byKey(const Key('notes-title-wordmark')), findsOneWidget);
    expect(find.byType(GridView), findsOneWidget);

    expect(find.text('图片笔记'), findsOneWidget);
    expect(find.text('文本卡片'), findsOneWidget);
    expect(find.byType(InkWell), findsWidgets);
    expect(find.byType(InkWell), findsAtLeastNWidgets(3));
  });
}

class _LayoutAuthRepository implements AuthRepository {
  @override
  Future<Map<String, dynamic>> getCaptcha() async => const {
        'id': 'captcha-test',
        'image': '<svg></svg>',
      };

  @override
  Future<void> changePassword(
          {required String oldPassword, required String newPassword}) async =>
      Future.value();

  @override
  Future<UserProfile?> getProfile() async => const UserProfile(
        id: 'u1',
        username: 'tester',
        email: 'tester@example.com',
        isAdmin: false,
      );

  @override
  Future<void> login(
          {required String username, required String password}) async =>
      Future.value();

  @override
  Future<void> register({
    required String username,
    required String password,
    required String captchaId,
    required String captchaText,
  }) async =>
      Future.value();

  @override
  Future<void> logout() async => Future.value();

  @override
  Future<String?> readToken() async => 'token';

  @override
  Future<UserProfile?> updateSettings(
      {String? username,
      int? trashRetentionDays,
      int? shareRetentionDays}) async {
    return const UserProfile(
      id: 'u1',
      username: 'tester',
      email: 'tester@example.com',
      isAdmin: false,
    );
  }

  @override
  Future<UserProfile?> uploadAvatar({
    required List<int> bytes,
    required String filename,
  }) async =>
      null;
}

class _LayoutFoldersRepository implements FoldersRepository {
  @override
  Future<FolderItem> createFolder(String name) async =>
      FolderItem(id: 'f2', name: name);

  @override
  Future<List<FolderItem>> fetchFolders() async => const [
        FolderItem(id: 'f1', name: '密码'),
        FolderItem(id: 'f2', name: 'AI'),
        FolderItem(id: 'f3', name: 'AI账号'),
      ];
}

class _LayoutNotesRepository implements NotesRepository {
  @override
  Future<NoteItem> create(
          {required String title,
          required String content,
          String? folderId}) async =>
      throw UnimplementedError();

  @override
  Future<void> delete(String id) async => Future.value();

  @override
  Future<List<NoteItem>> fetchAll({String? folderId}) async => [
        NoteItem(
          id: 'n1',
          title: '图片笔记',
          content: '<img src="https://example.com/demo.png" /><p>一段较短内容</p>',
          isFavorite: false,
          isPinned: false,
          isDeleted: false,
          updatedAt: DateTime(2026, 4, 14),
          createdAt: DateTime(2026, 4, 14),
        ),
        NoteItem(
          id: 'n2',
          title: '文本卡片',
          content: '<p>这是一段普通文本笔记内容，用来验证白卡和不同高度布局。</p>',
          isFavorite: false,
          isPinned: false,
          isDeleted: false,
          updatedAt: DateTime(2026, 4, 14),
          createdAt: DateTime(2026, 4, 14),
        ),
        NoteItem(
          id: 'n3',
          title: '置顶卡片',
          content: '<p>重点信息说明</p>',
          isFavorite: false,
          isPinned: true,
          isDeleted: false,
          updatedAt: DateTime(2026, 4, 14),
          createdAt: DateTime(2026, 4, 14),
        ),
      ];

  @override
  Future<List<NoteItem>> fetchFavorites() async => const [];

  @override
  Future<List<NoteItem>> fetchTrash() async => const [];

  @override
  Future<NoteItem?> getById(String id) async => null;

  @override
  Future<List<Map<String, dynamic>>> getSharedLinks() async => const [];

  @override
  Future<NoteItem> permanentDelete(String id) async =>
      throw UnimplementedError();

  @override
  Future<NoteItem> restore(String id) async => throw UnimplementedError();

  @override
  Future<List<NoteItem>> search(String query) async => const [];

  @override
  Future<Map<String, dynamic>> share(String id) async => const {};

  @override
  Future<Map<String, dynamic>> shareInfo(String id) async => const {};

  @override
  Future<Map<String, dynamic>> stats() async => const {'totalNotes': 1};

  @override
  Future<NoteItem> toggleFavorite(String id) async =>
      throw UnimplementedError();

  @override
  Future<NoteItem> togglePin(String id) async => throw UnimplementedError();

  @override
  Future<NoteItem> update(
          {required String id,
          required String title,
          required String content,
          String? folderId}) async =>
      throw UnimplementedError();

  @override
  Future<Map<String, dynamic>> revokeShare(String id) async => const {};
}
