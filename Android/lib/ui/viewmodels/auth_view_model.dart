import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/domain/entities/user_profile.dart';

class AuthState {
  const AuthState({
    this.loading = false,
    this.profile,
    this.errorMessage,
  });

  final bool loading;
  final UserProfile? profile;
  final String? errorMessage;

  AuthState copyWith({
    bool? loading,
    UserProfile? profile,
    String? errorMessage,
  }) {
    return AuthState(
      loading: loading ?? this.loading,
      profile: profile ?? this.profile,
      errorMessage: errorMessage,
    );
  }
}

class AuthViewModel extends StateNotifier<AuthState> {
  AuthViewModel(this.ref) : super(const AuthState());

  final Ref ref;

  Future<void> login(
      {required String username, required String password}) async {
    state = state.copyWith(loading: true, errorMessage: null);
    try {
      final authRepository = ref.read(authRepositoryProvider);
      await authRepository.login(username: username, password: password);
      final profile = await authRepository.getProfile();
      state = AuthState(loading: false, profile: profile);
    } catch (error) {
      state = AuthState(
        loading: false,
        errorMessage: _mapError(error),
      );
    }
  }

  Future<bool> restoreSession() async {
    try {
      await ref.read(serverBaseUrlProvider.notifier).load();
      final authRepository = ref.read(authRepositoryProvider);
      final token = await authRepository.readToken();
      if (token == null || token.isEmpty) {
        state = const AuthState();
        return false;
      }
      ref.read(apiClientProvider).dio.options.headers['Authorization'] =
          'Bearer $token';
      final profile = await authRepository.getProfile();
      state = AuthState(profile: profile);
      return profile != null;
    } catch (error) {
      if (error is DioException && error.response?.statusCode == 401) {
        await ref.read(tokenStorageProvider).clearToken();
        ref.read(apiClientProvider).dio.options.headers.remove('Authorization');
      }
      state = AuthState(errorMessage: _mapError(error));
      return false;
    }
  }

  Future<UserProfile> enterOfflineMode() async {
    await ref.read(offlineModeProvider.notifier).setOfflineMode(true);
    await ref.read(tokenStorageProvider).clearToken();
    ref.read(apiClientProvider).dio.options.headers.remove('Authorization');
    const profile = UserProfile(
      id: 'local-user',
      username: '本地用户',
      email: null,
      isAdmin: false,
    );
    state = const AuthState(profile: profile);
    return profile;
  }

  Future<void> updateSettings({
    String? username,
    int? trashRetentionDays,
    int? shareRetentionDays,
  }) async {
    state = state.copyWith(loading: true, errorMessage: null);
    try {
      final profile = await ref.read(authRepositoryProvider).updateSettings(
            username: username,
            trashRetentionDays: trashRetentionDays,
            shareRetentionDays: shareRetentionDays,
          );
      state = AuthState(loading: false, profile: profile ?? state.profile);
    } catch (error) {
      state = state.copyWith(loading: false, errorMessage: _mapError(error));
    }
  }

  Future<void> uploadAvatar({
    required List<int> bytes,
    required String filename,
  }) async {
    state = state.copyWith(loading: true, errorMessage: null);
    try {
      final profile = await ref.read(authRepositoryProvider).uploadAvatar(
            bytes: bytes,
            filename: filename,
          );
      state = AuthState(loading: false, profile: profile ?? state.profile);
    } catch (error) {
      state = state.copyWith(loading: false, errorMessage: _mapError(error));
    }
  }

  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    state = state.copyWith(loading: true, errorMessage: null);
    try {
      await ref.read(authRepositoryProvider).changePassword(
            oldPassword: oldPassword,
            newPassword: newPassword,
          );
      state = state.copyWith(loading: false, errorMessage: null);
    } catch (error) {
      state = state.copyWith(loading: false, errorMessage: _mapError(error));
    }
  }

  Future<void> logout() async {
    state = state.copyWith(loading: true, errorMessage: null);
    try {
      await ref.read(authRepositoryProvider).logout();
      state = const AuthState();
    } catch (error) {
      state = state.copyWith(loading: false, errorMessage: _mapError(error));
    }
  }

  void debugSetProfile(UserProfile profile) {
    state = AuthState(profile: profile);
  }

  String _mapError(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map<String, dynamic>) {
        final message = data['message'];
        if (message is String && message.trim().isNotEmpty) {
          return message;
        }
      }
      final statusCode = error.response?.statusCode;
      if (statusCode == 401) return '用户名或密码错误';
      if (statusCode == 404) return '服务器地址不正确或接口不存在';
      return error.message ?? '网络请求失败';
    }
    return error.toString().replaceFirst('Exception: ', '');
  }
}

final authViewModelProvider = StateNotifierProvider<AuthViewModel, AuthState>(
  (ref) => AuthViewModel(ref),
);
