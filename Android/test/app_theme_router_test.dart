import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mynote_android/app/app.dart';

void main() {
  testWidgets('MyNoteApp uses Material 3 custom theme and router shell',
      (tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyNoteApp()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    final materialApp = tester.widget<MaterialApp>(find.byType(MaterialApp));

    expect(materialApp.routerConfig, isNotNull);
    expect(materialApp.theme?.useMaterial3, isTrue);
    expect(materialApp.theme?.navigationBarTheme.backgroundColor, isNotNull);
    expect(find.text('MyNote'), findsOneWidget);
  });

  testWidgets('dark app shell uses light system bar icons', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyNoteApp()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    final region = tester.widget<AnnotatedRegion<SystemUiOverlayStyle>>(
      find.byType(AnnotatedRegion<SystemUiOverlayStyle>).first,
    );

    expect(region.value.statusBarIconBrightness, Brightness.light);
    expect(region.value.systemNavigationBarIconBrightness, Brightness.light);
  });
}
