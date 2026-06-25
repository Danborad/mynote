import 'package:flutter_test/flutter_test.dart';
import 'package:mynote_android/data/services/editor_autosave_service.dart';

void main() {
  test('debounces to last scheduled action only', () async {
    final service = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));
    var calls = 0;

    service.schedule(() async => calls++);
    service.schedule(() async => calls += 10);

    await Future<void>.delayed(const Duration(milliseconds: 30));

    expect(calls, 10);
  });

  test('cancel prevents pending autosave', () async {
    final service = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));
    var calls = 0;

    service.schedule(() async => calls++);
    service.cancel();

    await Future<void>.delayed(const Duration(milliseconds: 30));

    expect(calls, 0);
  });
}
