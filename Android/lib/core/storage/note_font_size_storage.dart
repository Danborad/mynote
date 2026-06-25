import 'package:shared_preferences/shared_preferences.dart';

enum NoteFontSize {
  small('small', '小', 14.5, 0.82),
  medium('medium', '中', 15.5, 0.86),
  large('large', '大', 17.0, 0.96);

  const NoteFontSize(
    this.storageValue,
    this.label,
    this.readerFontSize,
    this.editorTextScaleFactor,
  );

  final String storageValue;
  final String label;
  final double readerFontSize;
  final double editorTextScaleFactor;

  static NoteFontSize fromStorageValue(String? value) {
    return NoteFontSize.values.firstWhere(
      (size) => size.storageValue == value,
      orElse: () => NoteFontSize.medium,
    );
  }
}

class NoteFontSizeStorage {
  static const key = 'note_detail_font_size';

  Future<NoteFontSize> readFontSize() async {
    final prefs = await SharedPreferences.getInstance();
    return NoteFontSize.fromStorageValue(prefs.getString(key));
  }

  Future<void> saveFontSize(NoteFontSize size) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, size.storageValue);
  }
}
