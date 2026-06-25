import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mynote_android/ui/views/auth/login_view.dart';

void main() {
  testWidgets('LoginView is scrollable and shows server/login sections',
      (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: LoginView()),
      ),
    );
    await tester.pump();

    expect(find.byType(SingleChildScrollView), findsOneWidget);
    expect(find.text('当前服务器'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, '进入笔记'), findsOneWidget);
  });
}
