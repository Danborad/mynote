import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mynote_android/core/storage/theme_mode_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('readThemeMode defaults to system when nothing is stored', () async {
    final storage = ThemeModeStorage();
    expect(await storage.readThemeMode(), ThemeMode.system);
  });

  test('readThemeMode returns system when previously saved as system',
      () async {
    SharedPreferences.setMockInitialValues({'app_theme_mode': 'system'});
    final storage = ThemeModeStorage();
    expect(await storage.readThemeMode(), ThemeMode.system);
  });

  test('readThemeMode returns dark for legacy raw "dark"', () async {
    SharedPreferences.setMockInitialValues({'app_theme_mode': 'dark'});
    final storage = ThemeModeStorage();
    expect(await storage.readThemeMode(), ThemeMode.dark);
  });

  test('saveThemeMode round-trips light, dark, and system', () async {
    final storage = ThemeModeStorage();

    await storage.saveThemeMode(ThemeMode.system);
    expect(await storage.readThemeMode(), ThemeMode.system);

    await storage.saveThemeMode(ThemeMode.light);
    expect(await storage.readThemeMode(), ThemeMode.light);

    await storage.saveThemeMode(ThemeMode.dark);
    expect(await storage.readThemeMode(), ThemeMode.dark);

    await storage.saveThemeMode(ThemeMode.system);
    expect(await storage.readThemeMode(), ThemeMode.system);
  });
}
