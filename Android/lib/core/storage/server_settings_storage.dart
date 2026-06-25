import 'package:shared_preferences/shared_preferences.dart';

class ServerSettingsStorage {
  static const _baseUrlKey = 'server_base_url';
  static const defaultBaseUrl = 'http://127.0.0.1:3665';

  Future<String> readBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_baseUrlKey) ?? defaultBaseUrl;
  }

  Future<void> saveBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseUrlKey, url);
  }
}
