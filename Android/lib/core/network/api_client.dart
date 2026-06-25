import 'package:dio/dio.dart';
import 'package:mynote_android/core/storage/token_storage.dart';

class ApiClient {
  ApiClient({
    Dio? dio,
    String? baseUrl,
    TokenStorage? tokenStorage,
  })  : dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: _normalizeBaseUrl(baseUrl ?? 'http://127.0.0.1:3665'),
                connectTimeout: const Duration(seconds: 15),
                receiveTimeout: const Duration(seconds: 15),
                headers: const {'Content-Type': 'application/json'},
              ),
            ),
        tokenStorage = tokenStorage ?? TokenStorage() {
    this.dio.interceptors.add(
          InterceptorsWrapper(
            onRequest: (options, handler) async {
              final hasAuthorization =
                  options.headers.containsKey('Authorization') ||
                      this.dio.options.headers.containsKey('Authorization');
              if (!hasAuthorization) {
                final token = await this.tokenStorage.readToken();
                if (token != null && token.isNotEmpty) {
                  options.headers['Authorization'] = 'Bearer $token';
                }
              }
              handler.next(options);
            },
            onResponse: (response, handler) {
              handler.next(response);
            },
            onError: (error, handler) {
              handler.next(error);
            },
          ),
        );
  }

  final Dio dio;
  final TokenStorage tokenStorage;

  static String _normalizeBaseUrl(String raw) {
    final normalized = raw.trim().replaceAll(RegExp(r'/+$'), '');
    if (normalized.endsWith('/api')) {
      return normalized;
    }
    return '$normalized/api';
  }
}
