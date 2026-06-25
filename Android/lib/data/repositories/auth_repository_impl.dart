import 'package:dio/dio.dart';
import 'package:mynote_android/core/network/api_client.dart';
import 'package:mynote_android/core/storage/token_storage.dart';
import 'package:mynote_android/data/models/auth/user_profile_model.dart';
import 'package:mynote_android/domain/entities/user_profile.dart';
import 'package:mynote_android/domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl({required this.apiClient, required this.tokenStorage});

  final ApiClient apiClient;
  final TokenStorage tokenStorage;

  @override
  Future<UserProfile?> getProfile() async {
    final response =
        await apiClient.dio.get<Map<String, dynamic>>('/auth/profile');
    final data = response.data;
    if (data == null) return null;
    return UserProfileModel.fromJson(data).toEntity();
  }

  @override
  Future<void> login(
      {required String username, required String password}) async {
    final response = await apiClient.dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'username': username, 'password': password},
    );
    final token = response.data?['access_token'] as String?;
    if (token != null && token.isNotEmpty) {
      await tokenStorage.saveToken(token);
      await tokenStorage.saveCredentials(
        username: username,
        password: password,
      );
      apiClient.dio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

  @override
  Future<Map<String, dynamic>> getCaptcha() async {
    final response = await apiClient.dio.get<Map<String, dynamic>>('/captcha');
    return Map<String, dynamic>.from(response.data ?? const {});
  }

  @override
  Future<void> register({
    required String username,
    required String password,
    required String captchaId,
    required String captchaText,
  }) async {
    final response = await apiClient.dio.post<Map<String, dynamic>>(
      '/auth/register',
      data: {
        'username': username,
        'password': password,
        'captchaId': captchaId,
        'captchaText': captchaText,
      },
    );
    final token = response.data?['access_token'] as String?;
    if (token != null && token.isNotEmpty) {
      await tokenStorage.saveToken(token);
      await tokenStorage.saveCredentials(
        username: username,
        password: password,
      );
      apiClient.dio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

  @override
  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    await apiClient.dio.post<Map<String, dynamic>>(
      '/auth/password',
      data: {
        'oldPassword': oldPassword,
        'newPassword': newPassword,
      },
    );
  }

  @override
  Future<void> logout() async {
    await tokenStorage.clearToken();
    apiClient.dio.options.headers.remove('Authorization');
  }

  @override
  Future<UserProfile?> updateSettings({
    String? username,
    int? trashRetentionDays,
    int? shareRetentionDays,
  }) async {
    final response = await apiClient.dio.post<Map<String, dynamic>>(
      '/auth/settings',
      data: {
        if (username != null) 'username': username,
        if (trashRetentionDays != null)
          'trashRetentionDays': trashRetentionDays,
        if (shareRetentionDays != null)
          'shareRetentionDays': shareRetentionDays,
      },
    );
    final data = response.data;
    if (data == null) return null;
    return UserProfileModel.fromJson(data).toEntity();
  }

  @override
  Future<UserProfile?> uploadAvatar({
    required List<int> bytes,
    required String filename,
  }) async {
    final response = await apiClient.dio.post<Map<String, dynamic>>(
      '/auth/avatar',
      data: FormData.fromMap({
        'file': MultipartFile.fromBytes(bytes, filename: filename),
      }),
      options: Options(contentType: 'multipart/form-data'),
    );
    final data = response.data;
    if (data == null) return null;
    return UserProfileModel.fromJson(data).toEntity();
  }

  @override
  Future<String?> readToken() {
    return tokenStorage.readToken();
  }
}
