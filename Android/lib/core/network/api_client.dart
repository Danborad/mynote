import 'package:dio/dio.dart';
import 'package:mynote_android/core/storage/token_storage.dart';

class ApiClient {
  ApiClient({
    Dio? dio,
    String? baseUrl,
    TokenStorage? tokenStorage,
    void Function(String message)? onLog,
  })
      : dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: _normalizeBaseUrl(baseUrl ?? 'http://127.0.0.1:3665'),
                connectTimeout: const Duration(seconds: 15),
                receiveTimeout: const Duration(seconds: 15),
                headers: const {'Content-Type': 'application/json'},
              ),
            ),
        tokenStorage = tokenStorage ?? TokenStorage(),
        onLog = onLog ?? ((_) {}) {
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
              // ignore: avoid_print
              print(
                  '[API] ${options.method} ${options.baseUrl}${options.path}');
              this.onLog(
                  'API ${options.method} ${options.baseUrl}${options.path} token=${options.headers.containsKey('Authorization') ? 'yes' : 'no'}');
              handler.next(options);
            },
            onResponse: (response, handler) {
              this.onLog(
                  'API ${response.statusCode} ${response.requestOptions.path}');
              handler.next(response);
            },
            onError: (error, handler) {
              // ignore: avoid_print
              print(
                  '[API][${error.response?.statusCode}] ${error.requestOptions.method} ${error.requestOptions.baseUrl}${error.requestOptions.path}');
              this.onLog(
                  'API ERR ${error.response?.statusCode ?? '-'} ${error.requestOptions.path} ${error.message ?? ''}');
              handler.next(error);
            },
          ),
        );
  }

  final Dio dio;
  final TokenStorage tokenStorage;
  final void Function(String message) onLog;

  static String _normalizeBaseUrl(String raw) {
    final normalized = raw.trim().replaceAll(RegExp(r'/+$'), '');
    if (normalized.endsWith('/api')) {
      return normalized;
    }
    return '$normalized/api';
  }
}
