import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/domain/entities/folder_item.dart';
import 'package:mynote_android/domain/entities/note_item.dart';
import 'package:mynote_android/domain/entities/user_profile.dart';
import 'package:mynote_android/domain/repositories/auth_repository.dart';
import 'package:mynote_android/domain/repositories/folders_repository.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';
import 'package:mynote_android/ui/views/auth/login_view.dart';

void main() {
  testWidgets('LoginView can switch to register mode and submit captcha form',
      (tester) async {
    final authRepository = _FakeRegisterAuthRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(authRepository),
          notesRepositoryProvider.overrideWithValue(_NoopNotesRepository()),
          foldersRepositoryProvider.overrideWithValue(_NoopFoldersRepository()),
        ],
        child: const MaterialApp(home: LoginView()),
      ),
    );

    await tester.pumpAndSettle();

    await tester.tap(find.text('切换到注册'));
    await tester.pumpAndSettle();

    expect(find.text('创建账号'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, '确认密码'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, '验证码'), findsOneWidget);
    expect(find.text('captcha-1'), findsNothing);
    expect(find.byType(Image), findsOneWidget);

    await tester.enterText(
        find.widgetWithText(TextFormField, '用户名'), 'new-user');
    await tester.enterText(
        find.widgetWithText(TextFormField, '密码'), 'new-pass-123');
    await tester.enterText(
        find.widgetWithText(TextFormField, '确认密码'), 'new-pass-123');
    await tester.enterText(find.widgetWithText(TextFormField, '验证码'), '12');
    await tester.scrollUntilVisible(
      find.widgetWithText(FilledButton, '创建账户'),
      180,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '创建账户'));
    await tester.pumpAndSettle();

    expect(authRepository.registeredUsername, 'new-user');
    expect(authRepository.registeredCaptchaId, 'captcha-1');
    expect(authRepository.registeredCaptchaText, '12');
  });
}

class _FakeRegisterAuthRepository implements AuthRepository {
  String? registeredUsername;
  String? registeredCaptchaId;
  String? registeredCaptchaText;

  @override
  Future<void> changePassword(
      {required String oldPassword, required String newPassword}) async {}

  @override
  Future<UserProfile?> getProfile() async => const UserProfile(
        id: 'u1',
        username: 'tester',
        email: 'tester@example.com',
        isAdmin: false,
      );

  @override
  Future<Map<String, dynamic>> getCaptcha() async => const {
        'id': 'captcha-1',
        'image':
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lGlJGQAAAABJRU5ErkJggg==',
      };

  @override
  Future<void> login(
      {required String username, required String password}) async {}

  @override
  Future<void> logout() async {}

  @override
  Future<String?> readToken() async => null;

  @override
  Future<void> register({
    required String username,
    required String password,
    required String captchaId,
    required String captchaText,
  }) async {
    registeredUsername = username;
    registeredCaptchaId = captchaId;
    registeredCaptchaText = captchaText;
  }

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
}

class _NoopFoldersRepository implements FoldersRepository {
  @override
  Future<FolderItem> createFolder(String name) async =>
      throw UnimplementedError();

  @override
  Future<List<FolderItem>> fetchFolders() async => const [];
}

class _NoopNotesRepository implements NotesRepository {
  @override
  Future<NoteItem> create(
          {required String title,
          required String content,
          String? folderId}) async =>
      throw UnimplementedError();
  @override
  Future<void> delete(String id) async {}
  @override
  Future<List<NoteItem>> fetchAll({String? folderId}) async => const [];
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
  Future<Map<String, dynamic>> revokeShare(String id) async => const {};
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
  @override
  Future<NoteItem> update(
          {required String id,
          required String title,
          required String content,
          String? folderId}) async =>
      throw UnimplementedError();
}
