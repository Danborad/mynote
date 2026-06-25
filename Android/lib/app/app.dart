import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/app/router/app_router.dart';
import 'package:mynote_android/app/theme/app_theme.dart';

class MyNoteApp extends ConsumerWidget {
  const MyNoteApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(appThemeModeProvider);
    final effectiveDark = themeMode == ThemeMode.dark ||
        (themeMode == ThemeMode.system &&
            WidgetsBinding.instance.platformDispatcher.platformBrightness ==
                Brightness.dark);
    final systemIconBrightness =
        effectiveDark ? Brightness.light : Brightness.dark;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: systemIconBrightness,
        systemNavigationBarColor: Colors.transparent,
        systemNavigationBarIconBrightness: systemIconBrightness,
        systemNavigationBarDividerColor: Colors.transparent,
      ),
      child: MaterialApp.router(
        title: 'MyNote',
        debugShowCheckedModeBanner: false,
        theme: buildMyNoteLightTheme(),
        darkTheme: buildMyNoteDarkTheme(),
        themeMode: themeMode,
        routerConfig: createAppRouter(),
      ),
    );
  }
}
