import 'package:flutter_riverpod/flutter_riverpod.dart';

class DebugLogController extends StateNotifier<List<String>> {
  DebugLogController() : super(const []);

  void add(String message) {
    final time = DateTime.now().toIso8601String().substring(11, 19);
    state = ['$time  $message', ...state].take(80).toList();
  }

  void clear() {
    state = const [];
  }
}

final debugLogProvider =
    StateNotifierProvider<DebugLogController, List<String>>(
  (ref) => DebugLogController(),
);
