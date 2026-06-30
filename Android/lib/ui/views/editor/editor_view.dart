import 'dart:async';

import 'package:appflowy_editor/appflowy_editor.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:html/dom.dart' as dom;
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/app/theme/app_theme.dart';
import 'package:mynote_android/app/utils/note_preview.dart';
import 'package:mynote_android/core/network/server_url.dart';
import 'package:mynote_android/domain/entities/editor_format_capability.dart';
import 'package:mynote_android/ui/utils/app_snack_bar.dart';
import 'package:mynote_android/ui/utils/share_card_image.dart';
import 'package:mynote_android/ui/utils/share_image_preview.dart';
import 'package:mynote_android/ui/viewmodels/editor_view_model.dart';
import 'package:mynote_android/ui/widgets/editor_toolbar.dart';
import 'package:mynote_android/ui/widgets/folder_picker_sheet.dart';

class EditorView extends ConsumerStatefulWidget {
  const EditorView({
    super.key,
    required this.noteId,
    this.autoLoad = true,
    this.onBack,
  });

  static const editorDocumentKey = Key('editor-document');
  static const editorToolbarKey = Key('editor-toolbar');

  final String noteId;
  final bool autoLoad;
  final VoidCallback? onBack;

  @override
  ConsumerState<EditorView> createState() => _EditorViewState();
}

class _EditorViewState extends ConsumerState<EditorView> {
  EditorState? _editorState;
  StreamSubscription<dynamic>? _editorSubscription;
  String? _boundHtml;
  String? _editorBootstrapError;
  bool _initialFocusReleased = false;
  static const _shareChannel = MethodChannel('mynote/share');

  String get _currentHtml =>
      ref.read(editorViewModelProvider(widget.noteId)).document.html;

  @override
  void initState() {
    super.initState();
    if (widget.autoLoad) {
      Future<void>.microtask(
        () => ref.read(editorViewModelProvider(widget.noteId).notifier).load(),
      );
    }
  }

  @override
  void didUpdateWidget(covariant EditorView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.noteId == widget.noteId) {
      return;
    }

    _editorSubscription?.cancel();
    _editorSubscription = null;
    _editorState?.dispose();
    _editorState = null;
    _boundHtml = null;
    _editorBootstrapError = null;

    if (widget.autoLoad) {
      Future<void>.microtask(
        () => ref.read(editorViewModelProvider(widget.noteId).notifier).load(),
      );
    }
  }

  @override
  void dispose() {
    _editorSubscription?.cancel();
    _editorState?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final noteId = widget.noteId;
    final state = ref.watch(editorViewModelProvider(noteId));
    final viewModel = ref.read(editorViewModelProvider(noteId).notifier);
    final noteFontSize = ref.watch(noteFontSizeProvider);
    final palette = context.palette;

    _ensureEditorState(state, viewModel);
    _releaseInitialFocusAfterLoad(state);
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _leaveEditor(context);
        }
      },
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        backgroundColor: palette.panelBackground,
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 6, 10, 8),
                child: Row(
                  children: [
                    IconButton(
                      tooltip: '返回',
                      onPressed: () => _leaveEditor(context),
                      style: IconButton.styleFrom(
                        foregroundColor: palette.secondaryText,
                        minimumSize: const Size(30, 30),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      icon: const Icon(Icons.arrow_back_rounded, size: 21),
                    ),
                    const Spacer(),
                    IconButton(
                      tooltip: state.isFavorite ? '取消收藏' : '收藏',
                      onPressed: () => _handleFavoriteTap(context, viewModel),
                      style: IconButton.styleFrom(
                        foregroundColor: state.isFavorite
                            ? const Color(0xFFEF4444)
                            : palette.mutedText,
                        backgroundColor: state.isFavorite
                            ? const Color(0xFFFFF1F2)
                            : Colors.transparent,
                        minimumSize: const Size(30, 30),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      icon: Icon(
                          state.isFavorite
                              ? Icons.favorite_rounded
                              : Icons.favorite_border_rounded,
                          size: 20),
                    ),
                    const SizedBox(width: 4),
                    IconButton(
                      tooltip: '删除',
                      onPressed: () => _handleDeleteTap(context, viewModel),
                      style: IconButton.styleFrom(
                        foregroundColor: palette.mutedText,
                        minimumSize: const Size(30, 30),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      icon: const Icon(Icons.delete_outline_rounded, size: 20),
                    ),
                    const SizedBox(width: 4),
                    IconButton(
                      tooltip: '更多',
                      onPressed: () => _showMoreActionsSheet(context, state),
                      style: IconButton.styleFrom(
                        foregroundColor: palette.mutedText,
                        minimumSize: const Size(30, 30),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      icon: const Icon(
                        Icons.more_horiz_rounded,
                        size: 20,
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 10, 18, 8),
                child: Row(
                  children: [
                    Text(
                      _formatEditorDate(DateTime.now()),
                      style: TextStyle(
                        fontSize: 14,
                        color: palette.mutedText,
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Divider(
                  height: 1,
                  thickness: 0.5,
                  color: palette.cardBorder.withOpacity(0.55),
                ),
              ),
              Expanded(
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: Container(
                        key: EditorView.editorDocumentKey,
                        color: palette.panelBackground,
                        padding: const EdgeInsets.fromLTRB(18, 14, 18, 12),
                        child: state.loading
                            ? const Center(child: CircularProgressIndicator())
                            : _editorState == null
                                ? _buildHtmlFallback(state.document.html)
                                : AppFlowyEditor(
                                    key: const Key('appflowy-editor-widget'),
                                    editorState: _editorState!,
                                    autoFocus: false,
                                    blockComponentBuilders:
                                        _compactBlockBuilders(),
                                    editorStyle: EditorStyle.mobile(
                                      padding: EdgeInsets.zero,
                                      cursorWidth: 2,
                                      maxWidth: 664,
                                      textScaleFactor:
                                          noteFontSize.editorTextScaleFactor,
                                      textStyleConfiguration:
                                          TextStyleConfiguration(
                                        text: TextStyle(
                                          fontSize: noteFontSize.readerFontSize,
                                          height: 1.36,
                                          letterSpacing: 0,
                                          color: palette.primaryText,
                                        ),
                                        lineHeight: 1.36,
                                      ),
                                    ),
                                    footer: const SizedBox(height: 88),
                                  ),
                      ),
                    ),
                    Positioned(
                      left: 40,
                      right: 40,
                      bottom: 12,
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 360),
                          child: DecoratedBox(
                            key: EditorView.editorToolbarKey,
                            decoration: BoxDecoration(
                              color: palette.panelBackground,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: palette.cardBorder),
                              boxShadow: [
                                BoxShadow(
                                  color: palette.cardShadow,
                                  blurRadius: 20,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 5,
                              ),
                              child: EditorToolbar(
                                onTap: (capability) {
                                  _handleToolbarTap(
                                    context,
                                    capability,
                                    viewModel,
                                  );
                                },
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _releaseInitialFocusAfterLoad(EditorViewState state) {
    if (_initialFocusReleased || !state.loaded) {
      return;
    }
    _initialFocusReleased = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      FocusManager.instance.primaryFocus?.unfocus();
    });
  }

  String _formatEditorDate(DateTime date) {
    String two(int value) => value.toString().padLeft(2, '0');
    return '${date.year}年${date.month}月${date.day}日 ${two(date.hour)}:${two(date.minute)}';
  }

  Map<String, BlockComponentBuilder> _compactBlockBuilders() {
    final compact = standardBlockComponentConfiguration.copyWith(
      padding: (_) => const EdgeInsets.symmetric(vertical: 1),
    );
    final compactImage = standardBlockComponentConfiguration.copyWith(
      padding: (_) => const EdgeInsets.symmetric(vertical: 6),
    );

    return {
      ...standardBlockComponentBuilderMap,
      ParagraphBlockKeys.type: ParagraphBlockComponentBuilder(
        configuration: compact.copyWith(placeholderText: (_) => ' '),
      ),
      BulletedListBlockKeys.type: BulletedListBlockComponentBuilder(
        configuration: compact,
      ),
      NumberedListBlockKeys.type: NumberedListBlockComponentBuilder(
        configuration: compact,
      ),
      TodoListBlockKeys.type: TodoListBlockComponentBuilder(
        configuration: compact,
      ),
      ImageBlockKeys.type: ImageBlockComponentBuilder(
        configuration: compactImage,
      ),
      'code': ParagraphBlockComponentBuilder(
        configuration: compact.copyWith(placeholderText: (_) => ' '),
      ),
    };
  }

  Future<void> _leaveEditor(BuildContext context) async {
    final onBack = widget.onBack;
    if (onBack != null) {
      onBack();
      return;
    }

    final navigator = Navigator.of(context);
    if (navigator.canPop()) {
      navigator.pop();
      return;
    }

    final router = GoRouter.maybeOf(context);
    if (router != null) {
      context.go('/notes');
    }
  }

  Future<void> _showMoreActionsSheet(
    BuildContext context,
    EditorViewState state,
  ) async {
    final editorContext = context;
    final message = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      isDismissible: true,
      enableDrag: true,
      isScrollControlled: true,
      builder: (sheetContext) {
        return SafeArea(
          top: false,
          child: Center(
            heightFactor: 1,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 380),
              child: Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.all(Radius.circular(14)),
                ),
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        const SizedBox(width: 36),
                        const Expanded(
                          child: Center(
                            child: Text(
                              '更多操作',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF111827),
                              ),
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.of(sheetContext).pop(),
                          icon: const Icon(Icons.close_rounded, size: 19),
                          color: const Color(0xFF6B7280),
                          style: IconButton.styleFrom(
                            minimumSize: const Size(32, 32),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final tileWidth = (constraints.maxWidth - 16) / 3;
                        return Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _MoreActionTile(
                              width: tileWidth,
                              icon: Icons.content_copy_rounded,
                              label: '复制文本',
                              onTap: () => _handleCopyText(sheetContext),
                            ),
                            _MoreActionTile(
                              width: tileWidth,
                              icon: Icons.image_outlined,
                              label: '插入媒体',
                              onTap: () => Navigator.of(sheetContext)
                                  .pop('__insert_media__'),
                            ),
                            _MoreActionTile(
                              width: tileWidth,
                              icon: Icons.image_outlined,
                              label: '图片分享',
                              onTap: () => Navigator.of(sheetContext)
                                  .pop('__share_image__'),
                            ),
                            _MoreActionTile(
                              width: tileWidth,
                              icon: Icons.link_rounded,
                              label: '链接分享',
                              onTap: () => _handleShareLink(sheetContext),
                            ),
                            _MoreActionTile(
                              width: tileWidth,
                              icon: Icons.folder_open_rounded,
                              label: '加入分组',
                              onTap: () => Navigator.of(sheetContext)
                                  .pop('__move_folder__'),
                            ),
                            _MoreActionTile(
                              width: tileWidth,
                              icon: Icons.description_outlined,
                              label: '导出 MD',
                              onTap: () => _handleExportMarkdown(sheetContext),
                            ),
                            _MoreActionTile(
                              width: tileWidth,
                              icon: Icons.text_snippet_outlined,
                              label: '导出文本',
                              onTap: () => _handleExportPlainText(sheetContext),
                            ),
                            _MoreActionTile(
                              width: tileWidth,
                              icon: Icons.push_pin_outlined,
                              label: state.isPinned ? '取消置顶' : '置顶',
                              onTap: () => _handlePinToggle(sheetContext),
                            ),
                          ],
                        );
                      },
                    ),
                    SizedBox(
                      height: MediaQuery.paddingOf(sheetContext).bottom,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
    if (!context.mounted || message == null || message.isEmpty) {
      return;
    }
    if (message == '__share_image__') {
      if (!editorContext.mounted) return;
      final palette = editorContext.palette;
      // Fire-and-forget: the native share sheet is the user-visible feedback.
      // We deliberately skip showing a snackbar here to keep the action clean.
      unawaited(_shareAsImageMessage(
        background: palette.cardBackground,
        titleColor: palette.primaryText,
        bodyColor: palette.secondaryText,
        footerColor: palette.mutedText,
      )..ignore());
      return;
    }
    if (message == '__insert_media__') {
      await _showInsertMediaSheet(
        context,
        ref.read(editorViewModelProvider(widget.noteId).notifier),
        _currentHtml,
      );
      return;
    }
    if (message == '__move_folder__') {
      await _handleMoveToFolder(context);
      return;
    }
    _showSnackBar(context, message);
  }

  Future<void> _handleFavoriteTap(
    BuildContext context,
    EditorViewModel viewModel,
  ) async {
    final updated = await viewModel.toggleFavorite();
    if (!context.mounted) return;
    _showSnackBar(
      context,
      updated == null
          ? '收藏失败'
          : updated.isFavorite
              ? '已收藏'
              : '已取消收藏',
    );
  }

  Future<void> _handleDeleteTap(
    BuildContext context,
    EditorViewModel viewModel,
  ) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('确认删除这篇笔记？'),
          content: const Text('删除后可在回收站中恢复。'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('取消'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('删除'),
            ),
          ],
        );
      },
    );
    if (shouldDelete != true || !context.mounted) {
      return;
    }

    final deleted = await viewModel.delete();
    if (!context.mounted) return;
    if (deleted) {
      _leaveEditor(context);
      return;
    }
    _showSnackBar(context, '删除失败');
  }

  Future<void> _handleCopyText(BuildContext context) async {
    try {
      await Clipboard.setData(
        ClipboardData(text: stripHtml(_currentHtml).trim()),
      );
      if (!context.mounted) return;
      Navigator.of(context).pop('已复制文本');
    } catch (_) {
      if (!context.mounted) return;
      Navigator.of(context).pop('复制失败');
    }
  }

  Future<void> _shareAsImageMessage({
    required Color background,
    required Color titleColor,
    required Color bodyColor,
    required Color footerColor,
  }) async {
    try {
      final state = ref.read(editorViewModelProvider(widget.noteId));
      final html = state.document.html;
      final preview = resolvePreviewDataUrls(
        extractPreviewData(html),
        serverBaseUrl: ref.read(serverBaseUrlProvider).valueOrNull,
      );
      final bytes = await renderShareCardImage(
        title: state.document.title.trim().isEmpty
            ? 'MyNote'
            : state.document.title.trim(),
        body: stripHtml(html).trim(),
        htmlContent: html,
        coverImageUrl: preview.image,
        footer: 'MyNote',
        background: background,
        titleColor: titleColor,
        bodyColor: bodyColor,
        footerColor: footerColor,
      );
      if (!mounted) return;
      final confirmed = await showShareImagePreview(context, bytes: bytes);
      if (!confirmed) return;
      await _shareChannel.invokeMethod<void>('shareNoteImage', {
        'filename': 'mynote-${widget.noteId}.png',
        'bytes': bytes,
      });
    } catch (_) {
      // Native share sheet is the user-visible feedback; silently swallow
      // any rendering/channel failure so we never interrupt the editor.
    }
  }

  Future<void> _handleShareLink(BuildContext context) async {
    final viewModel = ref.read(editorViewModelProvider(widget.noteId).notifier);
    try {
      final result = await viewModel.share();
      final shareUrl = result?['shareUrl']?.toString().trim() ?? '';
      if (shareUrl.isEmpty) {
        throw StateError('missing share url');
      }
      await Clipboard.setData(ClipboardData(text: shareUrl));
      if (!context.mounted) return;
      Navigator.of(context).pop('分享链接已复制');
    } catch (_) {
      if (!context.mounted) return;
      Navigator.of(context).pop('链接分享失败');
    }
  }

  Future<void> _handleMoveToFolder(BuildContext context) async {
    final folders = await ref.read(foldersRepositoryProvider).fetchFolders();
    if (!context.mounted) return;
    final currentFolderId =
        ref.read(editorViewModelProvider(widget.noteId)).folderId;
    final folder = await showFolderPickerSheet(
      context,
      folders: folders,
      currentFolderId: currentFolderId,
    );
    if (folder == null) return;

    final updated = await ref
        .read(editorViewModelProvider(widget.noteId).notifier)
        .moveToFolder(folder.id);
    if (!context.mounted) return;
    _showSnackBar(context, updated == null ? '加入分组失败' : '已加入分组');
  }

  Future<void> _handleExportMarkdown(BuildContext context) async {
    if (!context.mounted) return;
    Navigator.of(context).pop('导出 Markdown 暂未接入');
  }

  Future<void> _handleExportPlainText(BuildContext context) async {
    if (!context.mounted) return;
    Navigator.of(context).pop('导出纯文本 暂未接入');
  }

  Future<void> _handlePinToggle(BuildContext context) async {
    final viewModel = ref.read(editorViewModelProvider(widget.noteId).notifier);
    final updated = await viewModel.togglePin();
    if (!context.mounted) return;
    Navigator.of(context).pop(
      updated == null
          ? '置顶失败'
          : updated.isPinned
              ? '已置顶'
              : '已取消置顶',
    );
  }

  void _showSnackBar(BuildContext context, String message) {
    showAppSnackBar(context, message);
  }

  Widget _buildHtmlFallback(String html) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_editorBootstrapError != null) ...[
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF4E5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFF59E0B)),
              ),
              child: const Text(
                '富文本解析失败，当前降级为 HTML 视图。',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF92400E),
                ),
              ),
            ),
          ],
          SelectableText(
            html,
            style: TextStyle(
              fontSize: 14,
              height: 1.7,
              color: context.palette.primaryText,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleToolbarTap(
    BuildContext context,
    EditorFormatCapability capability,
    EditorViewModel viewModel,
  ) async {
    final editorState = _editorState;

    if (capability == EditorFormatCapability.image) {
      await _showInsertMediaSheet(context, viewModel, _currentHtml);
      return;
    }

    if (editorState != null) {
      final handled = await _applyCapabilityOnEditor(editorState, capability);
      if (handled) {
        _syncHtmlFromEditor(editorState, viewModel);
      } else {
        viewModel.applyFormatCapability(capability);
      }
    } else {
      viewModel.applyFormatCapability(capability);
    }
  }

  Future<void> _showInsertMediaSheet(
    BuildContext context,
    EditorViewModel viewModel,
    String currentHtml,
  ) async {
    final type = await showModalBottomSheet<EditorMediaType>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        final palette = sheetContext.palette;
        return SafeArea(
          top: false,
          child: Container(
            margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            decoration: BoxDecoration(
              color: Theme.of(sheetContext).colorScheme.surface,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.16),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              children: [
                _MediaInsertTile(
                  icon: Icons.image_outlined,
                  label: '图片',
                  onTap: () =>
                      Navigator.of(sheetContext).pop(EditorMediaType.image),
                ),
                const SizedBox(width: 8),
                _MediaInsertTile(
                  icon: Icons.graphic_eq_rounded,
                  label: '音频',
                  onTap: () =>
                      Navigator.of(sheetContext).pop(EditorMediaType.audio),
                ),
                const SizedBox(width: 8),
                _MediaInsertTile(
                  icon: Icons.movie_outlined,
                  label: '视频',
                  onTap: () =>
                      Navigator.of(sheetContext).pop(EditorMediaType.video),
                ),
                const SizedBox(width: 8),
                IconButton(
                  tooltip: '关闭',
                  onPressed: () => Navigator.of(sheetContext).pop(),
                  icon: const Icon(Icons.close_rounded),
                  color: palette.secondaryText,
                ),
              ],
            ),
          ),
        );
      },
    );
    if (type == null) return;

    final pickedPath = await viewModel.requestMediaUrl(type);
    if (pickedPath == null || pickedPath.trim().isEmpty) {
      return;
    }

    final uploadedPath = await viewModel.uploadMedia(type, pickedPath.trim());
    if (uploadedPath == null || uploadedPath.trim().isEmpty) {
      return;
    }

    await ref.read(serverBaseUrlProvider.notifier).load();
    final serverBaseUrl = ref.read(serverBaseUrlProvider).valueOrNull ?? '';
    final storageUrl = storageServerAssetPath(
      baseUrl: serverBaseUrl,
      assetUrl: uploadedPath.trim(),
    );
    if (storageUrl.trim().isEmpty) {
      return;
    }
    final displayUrl = resolveServerAssetUrl(
      baseUrl: serverBaseUrl,
      assetPath: storageUrl,
    );
    final html = _mediaHtml(type, storageUrl);
    final editorState = _editorState;
    if (type == EditorMediaType.image && editorState != null) {
      final beforeHtml = _documentToEditorHtml(editorState.document);
      await _ensureCollapsedSelection(editorState);
      await editorState.insertImageNode(displayUrl);
      final afterHtml = _documentToEditorHtml(editorState.document);
      viewModel.updateHtmlFromEditor(
        _storeCurrentServerAssetReferences(_normalizeEditorGeneratedHtml(
          afterHtml == beforeHtml ? '$beforeHtml$html' : afterHtml,
        )),
      );
    } else {
      viewModel.updateHtmlFromEditor(_appendHtmlBlock(currentHtml, html));
    }
    await viewModel.save();
  }

  String _mediaHtml(EditorMediaType type, String url) {
    return switch (type) {
      EditorMediaType.image => '<img src="$url" alt="image">',
      EditorMediaType.audio =>
        '<audio-player-component src="$url" filename="音频"></audio-player-component>',
      EditorMediaType.video =>
        '<video-player-component src="$url" filename="视频"></video-player-component>',
    };
  }

  String _appendHtmlBlock(String currentHtml, String html) {
    final trimmed = currentHtml.trim();
    if (trimmed.isEmpty || trimmed == '<p></p>') {
      return html;
    }
    return '$trimmed$html';
  }

  void _ensureEditorState(EditorViewState state, EditorViewModel viewModel) {
    if (_boundHtml == state.document.html && _editorState != null) {
      return;
    }

    _editorSubscription?.cancel();
    _editorState?.dispose();

    final serverBaseUrl = ref.read(serverBaseUrlProvider).valueOrNull ?? '';
    final html = resolveServerAssetReferences(
      html: state.document.html.trim(),
      baseUrl: serverBaseUrl,
    );
    final parseDocument = ref.read(editorDocumentParserProvider);
    try {
      final document = html.isEmpty
          ? Document.blank(withInitialText: true)
          : parseDocument(html);
      final editorState = EditorState(document: document);

      _editorSubscription = editorState.transactionStream.listen((_) {
        final nextHtml = _normalizeEditorGeneratedHtml(
          _documentToEditorHtml(editorState.document),
        );
        final nextStoredHtml = _storeCurrentServerAssetReferences(nextHtml);
        if (nextStoredHtml == _boundHtml) {
          return;
        }
        _syncHtmlFromEditor(editorState, viewModel);
      });

      _editorState = editorState;
      _boundHtml = state.document.html;
      _editorBootstrapError = null;
    } catch (error) {
      _editorState = null;
      _boundHtml = state.document.html;
      _editorBootstrapError = error.toString();
    }
  }

  void _syncHtmlFromEditor(EditorState editorState, EditorViewModel viewModel) {
    final html = _normalizeEditorGeneratedHtml(
        _documentToEditorHtml(editorState.document));
    final storedHtml = _storeCurrentServerAssetReferences(html);
    _boundHtml = storedHtml;
    viewModel.updateHtmlFromEditor(storedHtml);
  }

  String _documentToEditorHtml(Document document) {
    return documentToHTML(
      document,
      customParsers: const [_CodeBlockHtmlParser()],
    );
  }

  String _normalizeEditorGeneratedHtml(String html) {
    return html.replaceAllMapped(
      RegExp(r'<img\b[^>]*>', caseSensitive: false),
      (match) {
        final raw = match.group(0) ?? '';
        if (RegExp(r'\balt=', caseSensitive: false).hasMatch(raw)) {
          return raw;
        }
        final src =
            RegExp(r'\bsrc="([^"]+)"', caseSensitive: false).firstMatch(raw);
        final url = src?.group(1);
        if (url == null || url.isEmpty) {
          return raw;
        }
        return '<img src="$url" alt="image">';
      },
    );
  }

  String _storeCurrentServerAssetReferences(String html) {
    return storeServerAssetReferences(
      html: html,
      baseUrl: ref.read(serverBaseUrlProvider).valueOrNull ?? '',
    );
  }

  Future<void> _ensureCollapsedSelection(EditorState editorState) async {
    if (editorState.selection != null) {
      return;
    }

    final lastNode = editorState.document.root.children.isNotEmpty
        ? editorState.document.root.children.last
        : null;
    if (lastNode == null) {
      return;
    }

    final offset = lastNode.delta?.length ?? 0;
    await editorState.updateSelectionWithReason(
      Selection.collapsed(
        Position(
          path: lastNode.path,
          offset: offset,
        ),
      ),
      reason: SelectionUpdateReason.uiEvent,
    );
  }

  Future<bool> _applyCapabilityOnEditor(
    EditorState editorState,
    EditorFormatCapability capability,
  ) async {
    await _ensureCollapsedSelection(editorState);

    switch (capability) {
      case EditorFormatCapability.bold:
        await editorState.toggleAttribute(AppFlowyRichTextKeys.bold);
        return true;
      case EditorFormatCapability.italic:
        await editorState.toggleAttribute(AppFlowyRichTextKeys.italic);
        return true;
      case EditorFormatCapability.underline:
        await editorState.toggleAttribute(AppFlowyRichTextKeys.underline);
        return true;
      case EditorFormatCapability.codeBlock:
        editorState.formatNode(null, (node) {
          return node.copyWith(
            type: node.type == 'code' ? ParagraphBlockKeys.type : 'code',
          );
        });
        return true;
      case EditorFormatCapability.bulletList:
        editorState.formatNode(null, (node) {
          return node.copyWith(
            type: node.type == BulletedListBlockKeys.type
                ? ParagraphBlockKeys.type
                : BulletedListBlockKeys.type,
          );
        });
        return true;
      case EditorFormatCapability.taskList:
        editorState.formatNode(null, (node) {
          final toggledToTodo = node.type != TodoListBlockKeys.type;
          return node.copyWith(
            type: toggledToTodo
                ? TodoListBlockKeys.type
                : ParagraphBlockKeys.type,
            attributes: toggledToTodo
                ? {
                    ...node.attributes,
                    TodoListBlockKeys.checked: false,
                  }
                : {
                    ...node.attributes..remove(TodoListBlockKeys.checked),
                  },
          );
        });
        return true;
      case EditorFormatCapability.image:
        return false;
    }
  }
}

class _CodeBlockHtmlParser extends HTMLNodeParser {
  const _CodeBlockHtmlParser();

  @override
  String get id => 'code';

  @override
  String transformNodeToHTMLString(
    Node node, {
    required List<HTMLNodeParser> encodeParsers,
  }) {
    return toHTMLString(
      transformNodeToDomNodes(node, encodeParsers: encodeParsers),
    );
  }

  @override
  List<dom.Node> transformNodeToDomNodes(
    Node node, {
    required List<HTMLNodeParser> encodeParsers,
  }) {
    final pre = dom.Element.tag('pre');
    final code = dom.Element.tag(HTMLTags.code)
      ..append(dom.Text(node.delta?.toPlainText() ?? ''));
    pre.append(code);
    return [pre];
  }
}

extension _EditorThemePaletteX on BuildContext {
  MyNotePalette get palette {
    final brightness = Theme.of(this).brightness;
    return Theme.of(this).extension<MyNotePalette>() ??
        (brightness == Brightness.dark
            ? defaultDarkPalette
            : defaultLightPalette);
  }
}

class _MoreActionTile extends StatelessWidget {
  const _MoreActionTile({
    required this.width,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final double width;
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        key: ValueKey('more-action-$label'),
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: SizedBox(
          width: width,
          height: 72,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 19, color: const Color(0xFF111827)),
                const SizedBox(height: 7),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF111827),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MediaInsertTile extends StatelessWidget {
  const _MediaInsertTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          height: 64,
          decoration: BoxDecoration(
            color: palette.chipBackground,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: palette.cardBorder),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 20, color: palette.primaryText),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  color: palette.primaryText,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
