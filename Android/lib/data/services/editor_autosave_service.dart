import 'dart:async';

class EditorAutosaveService {
  EditorAutosaveService({
    this.debounceDuration = const Duration(milliseconds: 300),
  });

  final Duration debounceDuration;
  Timer? _timer;

  void schedule(Future<void> Function() action) {
    _timer?.cancel();
    _timer = Timer(debounceDuration, () {
      unawaited(action());
    });
  }

  void cancel() {
    _timer?.cancel();
    _timer = null;
  }
}
