import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('app theme mode defaults to dark and can switch', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    expect(container.read(appThemeModeProvider), ThemeMode.system);

    await container
        .read(appThemeModeProvider.notifier)
        .setThemeMode(ThemeMode.dark);

    expect(container.read(appThemeModeProvider), ThemeMode.dark);
  });
}
