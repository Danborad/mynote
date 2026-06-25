import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mynote_android/ui/viewmodels/auth_view_model.dart';

class SplashView extends ConsumerStatefulWidget {
  const SplashView({super.key});

  @override
  ConsumerState<SplashView> createState() => _SplashViewState();
}

class _SplashViewState extends ConsumerState<SplashView> {
  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      final hasSession =
          await ref.read(authViewModelProvider.notifier).restoreSession();
      if (!mounted) return;
      context.go(hasSession ? '/notes' : '/login');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Animate(
          effects: [
            FadeEffect(duration: 320.ms),
            SlideEffect(
                begin: const Offset(0, 0.08),
                end: Offset.zero,
                duration: 320.ms),
          ],
          child: const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'MyNote',
                style: TextStyle(
                  fontSize: 34,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF1F2A3D),
                  letterSpacing: -1.2,
                ),
              ),
              SizedBox(height: 10),
              SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(strokeWidth: 2.4),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
