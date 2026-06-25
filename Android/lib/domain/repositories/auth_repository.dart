import 'package:mynote_android/domain/entities/user_profile.dart';

abstract class AuthRepository {
  Future<void> login({required String username, required String password});

  Future<void> register({
    required String username,
    required String password,
    required String captchaId,
    required String captchaText,
  });

  Future<Map<String, dynamic>> getCaptcha();

  Future<UserProfile?> getProfile();

  Future<UserProfile?> updateSettings({
    String? username,
    int? trashRetentionDays,
    int? shareRetentionDays,
  });

  Future<UserProfile?> uploadAvatar({
    required List<int> bytes,
    required String filename,
  }) {
    throw UnsupportedError('uploadAvatar is not implemented');
  }

  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  });

  Future<String?> readToken();

  Future<void> logout();
}
