import 'dart:convert';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/domain/entities/user_profile.dart';
import 'package:mynote_android/ui/viewmodels/auth_view_model.dart';
import 'package:mynote_android/ui/widgets/mynote_wordmark.dart';

class LoginView extends ConsumerStatefulWidget {
  const LoginView({super.key});

  @override
  ConsumerState<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends ConsumerState<LoginView> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _captchaController = TextEditingController();
  final _serverController = TextEditingController();

  bool _isLogin = true;
  String _captchaId = '';
  String _captchaImage = '';
  String? _localError;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      final creds = await ref.read(tokenStorageProvider).readCredentials();
      if (mounted && creds != null) {
        _usernameController.text = creds.$1;
        _passwordController.text = creds.$2;
      }
    });
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _captchaController.dispose();
    _serverController.dispose();
    super.dispose();
  }

  Future<void> _loadCaptcha() async {
    try {
      final data = await ref.read(authRepositoryProvider).getCaptcha();
      if (!mounted) return;
      setState(() {
        _captchaId = '${data['id'] ?? ''}';
        _captchaImage = '${data['image'] ?? ''}';
        _captchaController.clear();
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _localError = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _toggleMode() async {
    setState(() {
      _isLogin = !_isLogin;
      _localError = null;
      _confirmPasswordController.clear();
      _captchaController.clear();
    });
    if (!_isLogin) {
      await _loadCaptcha();
    }
  }

  Future<void> _handleSubmit() async {
    setState(() {
      _localError = null;
    });

    if (_usernameController.text.trim().isEmpty ||
        _passwordController.text.trim().isEmpty) {
      setState(() {
        _localError = '请填写用户名和密码';
      });
      return;
    }

    if (_passwordController.text.length < 6) {
      setState(() {
        _localError = '密码长度不能少于6位';
      });
      return;
    }

    if (_isLogin) {
      await ref.read(authViewModelProvider.notifier).login(
            username: _usernameController.text,
            password: _passwordController.text,
          );
      return;
    }

    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() {
        _localError = '两次输入的密码不一致';
      });
      return;
    }

    if (_captchaController.text.trim().isEmpty) {
      setState(() {
        _localError = '请输入验证码';
      });
      return;
    }

    try {
      await ref.read(authRepositoryProvider).register(
            username: _usernameController.text.trim(),
            password: _passwordController.text,
            captchaId: _captchaId,
            captchaText: _captchaController.text.trim(),
          );
      final profile = await ref.read(authRepositoryProvider).getProfile();
      ref.read(authViewModelProvider.notifier).debugSetProfile(
            profile ??
                UserProfile(
                  id: '',
                  username: _usernameController.text.trim(),
                  email: null,
                  isAdmin: false,
                ),
          );
    } catch (error) {
      setState(() {
        _localError = error.toString().replaceFirst('Exception: ', '');
      });
      await _loadCaptcha();
    }
  }

  Future<void> _showServerSettings(String? currentUrl) async {
    _serverController.text = currentUrl ?? '';
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
        child: Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: const Color(0xFFE5EAF2)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x220F172A),
                blurRadius: 28,
                offset: Offset(0, 18),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Row(
                children: [
                  _ServerDialogIcon(),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '服务器地址',
                      style: TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF111827),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                '填写 MyNote 后端地址，例如 http://192.168.31.63:3665',
                style: TextStyle(
                  fontSize: 13,
                  height: 1.45,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 18),
              _EditorialInput(
                controller: _serverController,
                hintText: 'http://192.168.31.63:3665',
                labelText: '服务器地址',
                obscureText: false,
                icon: Icons.dns_outlined,
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(dialogContext).pop(),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(46),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text('取消'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () async {
                        final navigator = Navigator.of(dialogContext);
                        await ref
                            .read(serverBaseUrlProvider.notifier)
                            .save(_serverController.text);
                        if (!dialogContext.mounted) return;
                        navigator.pop();
                      },
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(46),
                        backgroundColor: const Color(0xFF2563EB),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text('保存'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authViewModelProvider);
    final serverBaseUrl = ref.watch(serverBaseUrlProvider);
    final errorText = _localError ?? authState.errorMessage;

    ref.listen<AuthState>(authViewModelProvider, (previous, next) {
      if (next.profile != null) {
        final router = GoRouter.maybeOf(context);
        if (router != null) {
          context.go('/notes');
        }
      }
    });

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFFDCEBFF),
              Color(0xFFF0F4FF),
              Color(0xFFE9F8FF),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 400),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(30),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(24, 30, 24, 26),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.88),
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(color: const Color(0xF2FFFFFF)),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x210F172A),
                            blurRadius: 32,
                            offset: Offset(0, 20),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Center(
                            child: MyNoteWordmark(fontSize: 31),
                          ),
                          const SizedBox(height: 28),
                          Text(
                            _isLogin ? '欢迎回来' : '创建账号',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              letterSpacing: -0.6,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            _isLogin
                                ? '进入你的私人笔记空间，从上次停下的地方继续记录。'
                                : '创建一个新的档案，用来保存笔记、摘录和灵感。',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 13,
                              height: 1.5,
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          if (errorText != null) ...[
                            const SizedBox(height: 18),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEECEC),
                                borderRadius: BorderRadius.circular(16),
                                border:
                                    Border.all(color: const Color(0xFFF8CACA)),
                              ),
                              child: Text(
                                errorText,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFFDC2626),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 26),
                          const _LoginFieldLabel(label: '用户名'),
                          const SizedBox(height: 8),
                          _EditorialInput(
                            controller: _usernameController,
                            hintText: '输入你的用户名',
                            labelText: '用户名',
                            obscureText: false,
                            icon: Icons.person_outline_rounded,
                          ),
                          const SizedBox(height: 18),
                          const _LoginFieldLabel(label: '密码'),
                          const SizedBox(height: 8),
                          _EditorialInput(
                            controller: _passwordController,
                            hintText: '••••••••',
                            labelText: '密码',
                            obscureText: true,
                            icon: Icons.lock_outline_rounded,
                          ),
                          if (!_isLogin) ...[
                            const SizedBox(height: 18),
                            const _LoginFieldLabel(label: '确认密码'),
                            const SizedBox(height: 8),
                            _EditorialInput(
                              controller: _confirmPasswordController,
                              hintText: '••••••••',
                              labelText: '确认密码',
                              obscureText: true,
                              icon: Icons.verified_user_outlined,
                            ),
                            const SizedBox(height: 18),
                            const _LoginFieldLabel(label: '验证码'),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Expanded(
                                  child: _EditorialInput(
                                    controller: _captchaController,
                                    hintText: '输入计算结果',
                                    labelText: '验证码',
                                    obscureText: false,
                                    icon: Icons.tag_rounded,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                InkWell(
                                  onTap: _loadCaptcha,
                                  borderRadius: BorderRadius.circular(16),
                                  child: Container(
                                    width: 148,
                                    height: 54,
                                    clipBehavior: Clip.antiAlias,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF8FAFC),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: const Color(0xFFD9E2EC),
                                      ),
                                    ),
                                    child: Stack(
                                      fit: StackFit.expand,
                                      children: [
                                        Container(
                                          decoration: const BoxDecoration(
                                            gradient: LinearGradient(
                                              begin: Alignment.topLeft,
                                              end: Alignment.bottomRight,
                                              colors: [
                                                Color(0xFFF8FBFF),
                                                Color(0xFFEAF1FF),
                                              ],
                                            ),
                                          ),
                                        ),
                                        _CaptchaImage(image: _captchaImage),
                                        const Positioned(
                                          right: 8,
                                          top: 8,
                                          child: Icon(
                                            Icons.refresh_rounded,
                                            size: 16,
                                            color: Color(0xFF64748B),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                          const SizedBox(height: 18),
                          _ServerEndpointButton(
                            key: const Key('login-server-endpoint-button'),
                            baseUrl: serverBaseUrl.valueOrNull,
                            onTap: () =>
                                _showServerSettings(serverBaseUrl.valueOrNull),
                          ),
                          const SizedBox(height: 22),
                          SizedBox(
                            height: 50,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x4D2563EB),
                                    blurRadius: 18,
                                    offset: Offset(0, 8),
                                  ),
                                ],
                              ),
                              child: FilledButton(
                                style: FilledButton.styleFrom(
                                  backgroundColor: const Color(0xFF2563EB),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                ),
                                onPressed:
                                    authState.loading ? null : _handleSubmit,
                                child: authState.loading
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : Text(
                                        _isLogin ? '进入笔记' : '创建账户',
                                        style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 30),
                          Container(
                            height: 1,
                            color: const Color(0xFFE2E8F0),
                          ),
                          const SizedBox(height: 18),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _isLogin ? '还没有账号？' : '已经有账号了？',
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF64748B),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              TextButton(
                                onPressed: _toggleMode,
                                child: Text(_isLogin ? '切换到注册' : '返回登录'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LoginFieldLabel extends StatelessWidget {
  const _LoginFieldLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: Color(0xFF1E293B),
      ),
    );
  }
}

class _ServerEndpointButton extends StatelessWidget {
  const _ServerEndpointButton({
    super.key,
    required this.baseUrl,
    required this.onTap,
  });

  final String? baseUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final value = baseUrl?.trim().isNotEmpty == true ? baseUrl! : '读取中...';
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FBFF),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFDCE6F6)),
          ),
          child: Row(
            children: [
              const _ServerDialogIcon(),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '当前服务器',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1F2937),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(
                Icons.edit_rounded,
                size: 18,
                color: Color(0xFF2563EB),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ServerDialogIcon extends StatelessWidget {
  const _ServerDialogIcon();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 34,
      height: 34,
      decoration: BoxDecoration(
        color: const Color(0xFFEAF1FF),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Icon(
        Icons.storage_rounded,
        color: Color(0xFF2563EB),
        size: 18,
      ),
    );
  }
}

class _EditorialInput extends StatelessWidget {
  const _EditorialInput({
    required this.controller,
    required this.hintText,
    required this.labelText,
    required this.obscureText,
    this.icon,
  });

  final TextEditingController controller;
  final String hintText;
  final String labelText;
  final bool obscureText;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      decoration: InputDecoration(
        labelText: labelText,
        floatingLabelBehavior: FloatingLabelBehavior.never,
        hintText: hintText,
        hintStyle: const TextStyle(
          color: Color(0xFFB0BACB),
          fontSize: 13,
        ),
        filled: true,
        fillColor: const Color(0xFAFFFFFF),
        prefixIcon: icon == null
            ? null
            : Icon(
                icon,
                size: 19,
                color: const Color(0xFF94A3B8),
              ),
        prefixIconConstraints: icon == null
            ? null
            : const BoxConstraints(minWidth: 44, minHeight: 44),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(17),
          borderSide: const BorderSide(color: Color(0xFFDDE5F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(17),
          borderSide: const BorderSide(color: Color(0xFFDDE5F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(17),
          borderSide: const BorderSide(color: Color(0xFF9DB4F5), width: 1.2),
        ),
      ),
    );
  }
}

class _CaptchaImage extends StatelessWidget {
  const _CaptchaImage({required this.image});

  final String image;

  @override
  Widget build(BuildContext context) {
    final value = image.trim();
    if (value.isEmpty) {
      return const Center(
        child: SizedBox(
          width: 22,
          height: 22,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    if (value.startsWith('data:image')) {
      final commaIndex = value.indexOf(',');
      if (commaIndex != -1) {
        final bytes = base64Decode(value.substring(commaIndex + 1));
        return Image.memory(
          bytes,
          fit: BoxFit.contain,
          gaplessPlayback: true,
          errorBuilder: (_, __, ___) => const _CaptchaFallback(),
        );
      }
    }

    if (value.startsWith('http')) {
      return Image.network(
        value,
        fit: BoxFit.contain,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) => const _CaptchaFallback(),
      );
    }

    try {
      return Image.memory(
        base64Decode(value),
        fit: BoxFit.contain,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) => const _CaptchaFallback(),
      );
    } catch (_) {
      return const _CaptchaFallback();
    }
  }
}

class _CaptchaFallback extends StatelessWidget {
  const _CaptchaFallback();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Icon(
        Icons.refresh_rounded,
        color: Color(0xFF64748B),
        size: 22,
      ),
    );
  }
}
