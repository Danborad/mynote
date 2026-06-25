import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mynote_android/ui/views/auth/login_view.dart';
import 'package:mynote_android/ui/widgets/mynote_wordmark.dart';

void main() {
  testWidgets('LoginView renders username password and submit action',
      (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: LoginView()),
      ),
    );
    await tester.pump();

    expect(find.text('欢迎回来'), findsOneWidget);
    expect(find.byType(MyNoteWordmark), findsOneWidget);
    expect(find.widgetWithText(TextFormField, '用户名'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, '密码'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, '进入笔记'), findsOneWidget);
  });
}
