import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mynote_android/app/theme/app_theme.dart';
import 'package:mynote_android/ui/utils/app_snack_bar.dart';

void main() {
  test('light theme uses a compact floating snackbar', () {
    final theme = buildMyNoteLightTheme();
    final snackBarTheme = theme.snackBarTheme;

    expect(snackBarTheme.behavior, SnackBarBehavior.floating);
    expect(snackBarTheme.width, 260);
    expect(snackBarTheme.elevation, 0);
    expect(snackBarTheme.backgroundColor, const Color(0xEE111827));
    expect(snackBarTheme.shape, isA<RoundedRectangleBorder>());
  });

  test('app snackbar is short and centered', () {
    final snackBar = buildAppSnackBar('已保存');

    expect(snackBar.duration, const Duration(milliseconds: 1400));
    final content = snackBar.content as Text;
    expect(content.textAlign, TextAlign.center);
  });
}
