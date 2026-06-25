import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mynote_android/ui/viewmodels/notes_board_view_model.dart';
import 'package:mynote_android/ui/views/auth/login_view.dart';
import 'package:mynote_android/ui/views/editor/editor_view.dart';
import 'package:mynote_android/ui/views/notes/notes_board_view.dart';
import 'package:mynote_android/ui/views/splash/splash_view.dart';

GoRouter createAppRouter() {
  return GoRouter(
    initialLocation: '/splash',
    routes: [
      GoRoute(
        path: '/splash',
        builder: (_, __) => const SplashView(),
      ),
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginView(),
      ),
      GoRoute(
        path: '/notes',
        builder: (_, __) => const NotesBoardView(),
        routes: [
          GoRoute(
            path: 'editor/:id',
            builder: (_, state) => _RoutedEditorView(
              noteId: state.pathParameters['id'] ?? '',
            ),
          ),
        ],
      ),
    ],
  );
}

class _RoutedEditorView extends ConsumerWidget {
  const _RoutedEditorView({required this.noteId});

  final String noteId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return EditorView(
      noteId: noteId,
      onBack: () async {
        ref.read(notesBoardViewModelProvider.notifier).leaveEditorImmediately();
        if (context.mounted) {
          context.go('/notes');
        }
      },
    );
  }
}
