import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mynote_android/app/app.dart';

void main() {
  testWidgets('MyNoteApp renders splash shell', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyNoteApp()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('MyNote'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
