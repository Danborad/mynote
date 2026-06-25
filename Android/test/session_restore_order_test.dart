import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/core/storage/server_settings_storage.dart';
import 'package:mynote_android/core/storage/token_storage.dart';
import 'package:mynote_android/domain/entities/user_profile.dart';
import 'package:mynote_android/domain/repositories/auth_repository.dart';
import 'package:mynote_android/ui/viewmodels/auth_view_model.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('restoreSession loads server base url before reading token/profile',
      () async {
    final container = ProviderContainer(
      overrides: [
        serverSettingsStorageProvider
            .overrideWithValue(_FakeServerSettingsStorage()),
        authRepositoryProvider.overrideWithValue(_FakeRestoreAuthRepository()),
      ],
    );
    addTearDown(container.dispose);

    final restored =
        await container.read(authViewModelProvider.notifier).restoreSession();

    expect(restored, isTrue);
    expect(container.read(serverBaseUrlProvider).valueOrNull,
        'http://192.168.31.88:3665');
  });

  test('enterOfflineMode creates local profile and enables offline mode',
      () async {
    SharedPreferences.setMockInitialValues({});
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(_NoTokenAuthRepository()),
        tokenStorageProvider.overrideWithValue(_FakeTokenStorage()),
      ],
    );
    addTearDown(container.dispose);

    final profile =
        await container.read(authViewModelProvider.notifier).enterOfflineMode();

    expect(profile.username, '本地用户');
    expect(container.read(authViewModelProvider).profile, profile);
    expect(container.read(offlineModeProvider), isTrue);
  });
}

class _FakeServerSettingsStorage extends ServerSettingsStorage {
  @override
  Future<String> readBaseUrl() async => 'http://192.168.31.88:3665';
}

class _FakeRestoreAuthRepository implements AuthRepository {
  @override
  Future<Map<String, dynamic>> getCaptcha() async => const {
        'id': 'captcha-test',
        'image': '<svg></svg>',
      };

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
  Future<void> logout() async {}

  @override
  Future<String?> readToken() async => 'persisted-token';

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

class _NoTokenAuthRepository extends _FakeRestoreAuthRepository {
  @override
  Future<String?> readToken() async => null;
}

class _FakeTokenStorage extends TokenStorage {
  @override
  Future<void> clearToken() async {}
}
