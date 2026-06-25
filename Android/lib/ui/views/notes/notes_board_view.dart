import 'package:flutter/cupertino.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/app/theme/app_theme.dart';
import 'package:mynote_android/core/storage/note_font_size_storage.dart';
import 'package:mynote_android/app/utils/note_preview.dart';
import 'package:mynote_android/domain/entities/folder_item.dart';
import 'package:mynote_android/domain/entities/note_item.dart';
import 'package:mynote_android/domain/entities/user_profile.dart';
import 'package:mynote_android/ui/utils/app_snack_bar.dart';
import 'package:mynote_android/ui/utils/share_card_image.dart';
import 'package:mynote_android/ui/utils/share_image_preview.dart';
import 'package:mynote_android/ui/viewmodels/auth_view_model.dart';
import 'package:mynote_android/ui/viewmodels/notes_board_view_model.dart';
import 'package:mynote_android/ui/views/editor/editor_view.dart';
import 'package:mynote_android/ui/widgets/folder_picker_sheet.dart';
import 'package:mynote_android/ui/widgets/mynote_wordmark.dart';

const String _appVersion = '1.0.0';
const String _githubUrl = 'https://github.com/Danborad/mynote';
const String _githubLatestReleaseApi =
    'https://api.github.com/repos/Danborad/mynote/releases/latest';

String _normalizeVersion(String version) => version
    .replaceFirst(RegExp(r'^v', caseSensitive: false), '')
    .split('+')
    .first
    .split('-')
    .first;

int _compareVersions(String left, String right) {
  final a = _normalizeVersion(left)
      .split('.')
      .map((part) => int.tryParse(part) ?? 0)
      .toList();
  final b = _normalizeVersion(right)
      .split('.')
      .map((part) => int.tryParse(part) ?? 0)
      .toList();
  final length = a.length > b.length ? a.length : b.length;
  for (var i = 0; i < length; i += 1) {
    final av = i < a.length ? a[i] : 0;
    final bv = i < b.length ? b[i] : 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

class NotesBoardView extends ConsumerStatefulWidget {
  const NotesBoardView({super.key});

  @override
  ConsumerState<NotesBoardView> createState() => _NotesBoardViewState();
}

class _NotesBoardViewState extends ConsumerState<NotesBoardView> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  final Set<String> _selectedNoteIds = <String>{};
  bool _searching = false;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(
      () async {
        await ref.read(serverBaseUrlProvider.notifier).load();
        await ref.read(notesBoardViewModelProvider.notifier).load();
      },
    );
  }

  @override
  void dispose() {
    _searchFocusNode.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notesBoardViewModelProvider);
    final user = ref.watch(authViewModelProvider).profile;
    final palette = context.palette;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final systemIconBrightness = isDark ? Brightness.light : Brightness.dark;
    ref.listen<AsyncValue<String>>(serverBaseUrlProvider, (previous, next) {
      final previousUrl = previous?.valueOrNull;
      final nextUrl = next.valueOrNull;
      if (nextUrl != null && previousUrl != nextUrl) {
        ref.read(notesBoardViewModelProvider.notifier).load();
      }
    });
    if (!_supportsMultiSelect(state.currentView) &&
        _selectedNoteIds.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          setState(_selectedNoteIds.clear);
        }
      });
    }

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: palette.panelBackground,
      drawer: _NotesDrawer(
        username: user?.username ?? '用户',
        avatarUrl: user?.avatar,
        notesCount: state.notesCount,
        favoritesCount: state.favoritesCount,
        trashCount: state.trashCount,
        storageUsage: state.storageUsageBytes,
        currentView: state.currentView,
        themeMode: ref.watch(appThemeModeProvider),
        onSelectAll: () async {
          Navigator.of(context).pop();
          await ref.read(notesBoardViewModelProvider.notifier).load();
        },
        onSelectFavorites: () async {
          Navigator.of(context).pop();
          await ref.read(notesBoardViewModelProvider.notifier).loadFavorites();
        },
        onSelectShares: () async {
          Navigator.of(context).pop();
          await ref.read(notesBoardViewModelProvider.notifier).loadShares();
        },
        onSelectTrash: () async {
          Navigator.of(context).pop();
          await ref.read(notesBoardViewModelProvider.notifier).loadTrash();
        },
        onSelectSettings: () {
          Navigator.of(context).pop();
          ref.read(notesBoardViewModelProvider.notifier).openSettings();
        },
        onSelectThemeMode: (mode) =>
            ref.read(appThemeModeProvider.notifier).setThemeMode(mode),
        onLogout: () async {
          Navigator.of(context).pop();
          await ref.read(authViewModelProvider.notifier).logout();
          if (!context.mounted) return;
          final router = GoRouter.maybeOf(context);
          if (router != null) {
            context.go('/login');
          }
        },
      ),
      body: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle(
          statusBarColor: palette.panelBackground,
          statusBarIconBrightness: systemIconBrightness,
          systemNavigationBarColor: palette.panelBackground,
          systemNavigationBarIconBrightness: systemIconBrightness,
        ),
        child: _WorkspaceBody(
          key: ValueKey(
            '${state.currentView.name}-${state.selectedNote?.id ?? ''}',
          ),
          scaffoldKey: _scaffoldKey,
          state: state,
          user: user,
          searching: _searching,
          searchController: _searchController,
          searchFocusNode: _searchFocusNode,
          onSearchTap: () {
            setState(() => _searching = true);
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                _searchFocusNode.requestFocus();
              }
            });
          },
          onCloseSearch: () async {
            _searchController.clear();
            _searchFocusNode.unfocus();
            setState(() => _searching = false);
            await ref.read(notesBoardViewModelProvider.notifier).load();
          },
          onSearchSubmitted: (query) =>
              ref.read(notesBoardViewModelProvider.notifier).searchNotes(query),
          selectedNoteIds: _selectedNoteIds,
          onClearSelection: _clearSelection,
          onSelectAllVisible: () => _selectAllVisible(state.notes),
          onToggleSelection: _toggleSelection,
          onStartSelection: _startSelection,
          onDeleteSelection: () => _deleteSelection(state.currentView),
          onMoveSelectionToFolder: () => _moveSelectionToFolder(context, state),
          onRestoreSelection: _restoreSelection,
          onPermanentlyDeleteSelection: _permanentlyDeleteSelection,
        ),
      ),
      floatingActionButton: state.currentView == NotesWorkspaceView.all
          ? SizedBox(
              width: 60,
              height: 60,
              child: FloatingActionButton(
                heroTag: 'add-note-fab',
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                tooltip: '新建笔记',
                onPressed: () async {
                  final note = await ref
                      .read(notesBoardViewModelProvider.notifier)
                      .createDraft(folderId: state.selectedFolderId);
                  if (note != null && context.mounted) {
                    _goToEditorRoute(context, note.id);
                  }
                },
                elevation: 10,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(22),
                ),
                child: const Icon(Icons.add, size: 32),
              ),
            )
          : null,
    );
  }

  bool _supportsMultiSelect(NotesWorkspaceView view) {
    return view == NotesWorkspaceView.all ||
        view == NotesWorkspaceView.favorites ||
        view == NotesWorkspaceView.trash;
  }

  void _startSelection(String id) {
    setState(() {
      _selectedNoteIds
        ..clear()
        ..add(id);
    });
  }

  void _toggleSelection(String id) {
    setState(() {
      if (_selectedNoteIds.contains(id)) {
        _selectedNoteIds.remove(id);
      } else {
        _selectedNoteIds.add(id);
      }
    });
  }

  void _clearSelection() {
    setState(_selectedNoteIds.clear);
  }

  void _selectAllVisible(List<NoteItem> notes) {
    setState(() {
      _selectedNoteIds
        ..clear()
        ..addAll(notes.map((note) => note.id));
    });
  }

  Future<void> _deleteSelection(NotesWorkspaceView view) async {
    final ids = Set<String>.from(_selectedNoteIds);
    _clearSelection();
    await ref.read(notesBoardViewModelProvider.notifier).deleteNotes(ids);
  }

  Future<void> _moveSelectionToFolder(
    BuildContext context,
    NotesBoardState state,
  ) async {
    final folder = await showFolderPickerSheet(
      context,
      folders: state.folders,
    );
    if (folder == null || !mounted) return;

    final ids = Set<String>.from(_selectedNoteIds);
    _clearSelection();
    await ref
        .read(notesBoardViewModelProvider.notifier)
        .moveNotesToFolder(ids, folder.id);
  }

  Future<void> _restoreSelection() async {
    final ids = Set<String>.from(_selectedNoteIds);
    _clearSelection();
    await ref.read(notesBoardViewModelProvider.notifier).restoreNotes(ids);
  }

  Future<void> _permanentlyDeleteSelection() async {
    final ids = Set<String>.from(_selectedNoteIds);
    _clearSelection();
    await ref
        .read(notesBoardViewModelProvider.notifier)
        .permanentlyDeleteNotes(ids);
  }
}

extension _ThemePaletteX on BuildContext {
  MyNotePalette get palette {
    final brightness = Theme.of(this).brightness;
    return Theme.of(this).extension<MyNotePalette>() ??
        (brightness == Brightness.dark
            ? defaultDarkPalette
            : defaultLightPalette);
  }
}

class _WorkspaceBody extends ConsumerWidget {
  const _WorkspaceBody({
    super.key,
    required this.scaffoldKey,
    required this.state,
    required this.user,
    required this.searching,
    required this.searchController,
    required this.searchFocusNode,
    required this.onSearchTap,
    required this.onCloseSearch,
    required this.onSearchSubmitted,
    required this.selectedNoteIds,
    required this.onClearSelection,
    required this.onSelectAllVisible,
    required this.onToggleSelection,
    required this.onStartSelection,
    required this.onDeleteSelection,
    required this.onMoveSelectionToFolder,
    required this.onRestoreSelection,
    required this.onPermanentlyDeleteSelection,
  });

  final GlobalKey<ScaffoldState> scaffoldKey;
  final NotesBoardState state;
  final UserProfile? user;
  final bool searching;
  final TextEditingController searchController;
  final FocusNode searchFocusNode;
  final VoidCallback onSearchTap;
  final VoidCallback onCloseSearch;
  final ValueChanged<String> onSearchSubmitted;
  final Set<String> selectedNoteIds;
  final VoidCallback onClearSelection;
  final VoidCallback onSelectAllVisible;
  final ValueChanged<String> onToggleSelection;
  final ValueChanged<String> onStartSelection;
  final VoidCallback onDeleteSelection;
  final VoidCallback onMoveSelectionToFolder;
  final VoidCallback onRestoreSelection;
  final VoidCallback onPermanentlyDeleteSelection;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (state.currentView == NotesWorkspaceView.settings) {
      return SafeArea(child: _SettingsPanel(user: user));
    }

    if (state.currentView == NotesWorkspaceView.editor &&
        state.selectedNote != null) {
      return EditorView(
        noteId: state.selectedNote!.id,
        onBack: () async {
          ref
              .read(notesBoardViewModelProvider.notifier)
              .leaveEditorImmediately();
          if (context.mounted) {
            _goToNotesRoute(context);
          }
        },
      );
    }

    return Column(
      children: [
        _HeaderSection(
          onMenuTap: () => scaffoldKey.currentState?.openDrawer(),
          avatarUrl: user?.avatar,
          username: user?.username ?? 'U',
          titleLabel: _headerLabelForView(state.currentView),
          searching: searching,
          searchController: searchController,
          searchFocusNode: searchFocusNode,
          onSearchTap: onSearchTap,
          onCloseSearch: onCloseSearch,
          onSearchSubmitted: onSearchSubmitted,
        ),
        if (state.currentView == NotesWorkspaceView.all)
          _FolderTabs(
            folders: state.folders,
            selectedFolderId: state.selectedFolderId,
            onSelectAll: () =>
                ref.read(notesBoardViewModelProvider.notifier).load(),
            onSelectFolder: (folderId) => ref
                .read(notesBoardViewModelProvider.notifier)
                .load(folderId: folderId),
            onAddFolder: () => _showCreateFolderSheet(context, ref),
          ),
        if (selectedNoteIds.isNotEmpty)
          _SelectionToolbar(
            count: selectedNoteIds.length,
            trashMode: state.currentView == NotesWorkspaceView.trash,
            onCancel: onClearSelection,
            onSelectAll: onSelectAllVisible,
            onDelete: onDeleteSelection,
            onMoveToFolder: onMoveSelectionToFolder,
            onRestore: onRestoreSelection,
            onPermanentDelete: onPermanentlyDeleteSelection,
          ),
        Expanded(
          child: _WorkspaceContent(
            state: state,
            selectedNoteIds: selectedNoteIds,
            onToggleSelection: onToggleSelection,
            onStartSelection: onStartSelection,
          ),
        ),
      ],
    );
  }

  String _headerLabelForView(NotesWorkspaceView view) {
    return switch (view) {
      NotesWorkspaceView.all => 'Settings Center',
      NotesWorkspaceView.favorites => 'Favorites Space',
      NotesWorkspaceView.shares => 'Share Links',
      NotesWorkspaceView.trash => 'Trash Box',
      NotesWorkspaceView.settings => 'Settings Center',
      NotesWorkspaceView.editor => 'Editor Space',
    };
  }

  Future<void> _showCreateFolderSheet(
      BuildContext context, WidgetRef ref) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return _CreateFolderSheet(
          onCreate: (name) =>
              ref.read(notesBoardViewModelProvider.notifier).createFolder(name),
        );
      },
    );
  }
}

class _CreateFolderSheet extends StatefulWidget {
  const _CreateFolderSheet({required this.onCreate});

  final Future<void> Function(String name) onCreate;

  @override
  State<_CreateFolderSheet> createState() => _CreateFolderSheetState();
}

class _CreateFolderSheetState extends State<_CreateFolderSheet> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    await widget.onCreate(_controller.text);
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    final palette = context.palette;

    return SafeArea(
      top: false,
      child: Align(
        alignment: Alignment.bottomCenter,
        child: Padding(
          padding: EdgeInsets.fromLTRB(18, 0, 18, bottom + 14),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: DecoratedBox(
              key: const Key('create-folder-sheet'),
              decoration: BoxDecoration(
                color: palette.cardBackground,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: palette.cardBorder),
                boxShadow: [
                  BoxShadow(
                    color: palette.cardShadow.withOpacity(0.9),
                    blurRadius: 22,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 96),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
                  child: Row(
                    children: [
                      Expanded(
                        child: DecoratedBox(
                          key: const Key('create-folder-field-shell'),
                          decoration: BoxDecoration(
                            color: palette.chipBackground,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: palette.cardBorder),
                          ),
                          child: TextField(
                            key: const Key('create-folder-field'),
                            controller: _controller,
                            autofocus: true,
                            textInputAction: TextInputAction.done,
                            style: TextStyle(
                              color: palette.primaryText,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                            decoration: InputDecoration(
                              hintText: '分组名称',
                              hintStyle: TextStyle(color: palette.mutedText),
                              isDense: true,
                              filled: false,
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 12,
                              ),
                            ),
                            onSubmitted: (_) => _submit(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: TextButton.styleFrom(
                          minimumSize: const Size(44, 34),
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text('取消'),
                      ),
                      const SizedBox(width: 4),
                      FilledButton(
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(58, 42),
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: _submit,
                        child: const Text('创建'),
                      ),
                    ],
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

class _WorkspaceContent extends ConsumerWidget {
  const _WorkspaceContent({
    required this.state,
    required this.selectedNoteIds,
    required this.onToggleSelection,
    required this.onStartSelection,
  });

  final NotesBoardState state;
  final Set<String> selectedNoteIds;
  final ValueChanged<String> onToggleSelection;
  final ValueChanged<String> onStartSelection;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final viewModel = ref.read(notesBoardViewModelProvider.notifier);
    if (state.loading && state.notes.isEmpty && state.sharedLinks.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null && state.error!.isNotEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline,
                  color: Color(0xFFD14343), size: 34),
              const SizedBox(height: 12),
              Text(
                state.error!,
                style: const TextStyle(
                  color: Color(0xFFD14343),
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: () async {
                  await ref
                      .read(offlineModeProvider.notifier)
                      .setOfflineMode(true);
                  await ref
                      .read(notesBoardViewModelProvider.notifier)
                      .reloadCurrent();
                },
                icon: const Icon(Icons.storage_rounded, size: 18),
                label: const Text('使用本地数据'),
              ),
              const SizedBox(height: 8),
              FilledButton.tonal(
                onPressed: () =>
                    ref.read(notesBoardViewModelProvider.notifier).load(),
                child: const Text('重新加载'),
              ),
            ],
          ),
        ),
      );
    }

    if (state.currentView == NotesWorkspaceView.shares) {
      return _SharedLinksList(links: state.sharedLinks);
    }

    Widget refreshable(Widget child) {
      return RefreshIndicator(
        onRefresh: viewModel.reloadCurrent,
        child: child,
      );
    }

    if (state.notes.isEmpty) {
      return refreshable(
        ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(10, 6, 10, 96),
          children: const [
            SizedBox(height: 180),
            _EmptyState(message: '没有从服务器读取到笔记'),
          ],
        ),
      );
    }

    return refreshable(
      GridView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(10, 6, 10, 96),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 6,
          crossAxisSpacing: 6,
          childAspectRatio: 1.32,
        ),
        itemCount: state.notes.length,
        itemBuilder: (context, index) {
          final note = state.notes[index];
          return _NoteCard(
            note: note,
            selected: selectedNoteIds.contains(note.id),
            selectionMode: selectedNoteIds.isNotEmpty,
            onLongPress: () => onStartSelection(note.id),
            onTap: () async {
              if (selectedNoteIds.isNotEmpty) {
                onToggleSelection(note.id);
                return;
              }
              await viewModel.openNote(note.id);
              if (context.mounted) {
                _goToEditorRoute(context, note.id);
              }
            },
          );
        },
      ),
    );
  }
}

void _goToEditorRoute(BuildContext context, String noteId) {
  if (GoRouter.maybeOf(context) != null) {
    context.go('/notes/editor/$noteId');
  }
}

void _goToNotesRoute(BuildContext context) {
  if (GoRouter.maybeOf(context) != null) {
    context.go('/notes');
  }
}

class _HeaderSection extends StatelessWidget {
  const _HeaderSection({
    required this.onMenuTap,
    required this.avatarUrl,
    required this.username,
    required this.titleLabel,
    required this.searching,
    required this.searchController,
    required this.searchFocusNode,
    required this.onSearchTap,
    required this.onCloseSearch,
    required this.onSearchSubmitted,
  });

  final VoidCallback onMenuTap;
  final String? avatarUrl;
  final String username;
  final String titleLabel;
  final bool searching;
  final TextEditingController searchController;
  final FocusNode searchFocusNode;
  final VoidCallback onSearchTap;
  final VoidCallback onCloseSearch;
  final ValueChanged<String> onSearchSubmitted;

  @override
  Widget build(BuildContext context) {
    final resolvedUrl = _resolveAvatarUrl(avatarUrl);

    final palette = context.palette;
    final topInset = MediaQuery.paddingOf(context).top;

    return Container(
      color: palette.panelBackground,
      padding: EdgeInsets.fromLTRB(16, topInset + 8, 16, 2),
      child: Row(
        children: [
          InkWell(
            onTap: onMenuTap,
            borderRadius: BorderRadius.circular(20),
            child: const SizedBox(
              width: 36,
              height: 36,
              child: Icon(Icons.menu, size: 26, color: Color(0xFF556070)),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 160),
              child: searching
                  ? TextField(
                      key: const Key('notes-search-field'),
                      controller: searchController,
                      focusNode: searchFocusNode,
                      autofocus: true,
                      textInputAction: TextInputAction.search,
                      onSubmitted: onSearchSubmitted,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: palette.primaryText,
                      ),
                      decoration: InputDecoration(
                        hintText: '搜索笔记',
                        isDense: true,
                        filled: true,
                        fillColor: palette.chipBackground,
                        prefixIcon: const Icon(Icons.search, size: 18),
                        suffixIcon: IconButton(
                          tooltip: '关闭搜索',
                          icon: const Icon(Icons.close_rounded, size: 18),
                          onPressed: onCloseSearch,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 8,
                        ),
                      ),
                    )
                  : const Align(
                      key: Key('notes-title-label'),
                      alignment: Alignment.centerLeft,
                      child: MyNoteWordmark(
                        key: Key('notes-title-wordmark'),
                        fontSize: 24,
                        align: TextAlign.left,
                      ),
                    ),
            ),
          ),
          if (!searching) ...[
            SizedBox(
              width: 48,
              height: 48,
              child: IconButton(
                tooltip: '搜索',
                onPressed: onSearchTap,
                style: IconButton.styleFrom(
                  foregroundColor: const Color(0xFF556070),
                  minimumSize: const Size(48, 48),
                ),
                icon: const Icon(Icons.search, size: 25),
              ),
            ),
            const SizedBox(width: 4),
          ],
          Container(
            width: 38,
            height: 38,
            decoration: const BoxDecoration(
              color: Color(0xFF2F3B4B),
              shape: BoxShape.circle,
            ),
            clipBehavior: Clip.antiAlias,
            child: resolvedUrl != null
                ? Image.network(
                    resolvedUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) =>
                        _AvatarFallback(username: username),
                  )
                : _AvatarFallback(username: username),
          ),
        ],
      ),
    );
  }
}

class _SelectionToolbar extends StatelessWidget {
  const _SelectionToolbar({
    required this.count,
    required this.trashMode,
    required this.onCancel,
    required this.onSelectAll,
    required this.onDelete,
    required this.onMoveToFolder,
    required this.onRestore,
    required this.onPermanentDelete,
  });

  final int count;
  final bool trashMode;
  final VoidCallback onCancel;
  final VoidCallback onSelectAll;
  final VoidCallback onDelete;
  final VoidCallback onMoveToFolder;
  final VoidCallback onRestore;
  final VoidCallback onPermanentDelete;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Container(
      color: palette.panelBackground,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
      child: Row(
        children: [
          IconButton(
            tooltip: '取消多选',
            onPressed: onCancel,
            icon: const Icon(Icons.close_rounded),
            color: palette.secondaryText,
          ),
          Text(
            '已选择 $count 项',
            style: TextStyle(
              color: palette.primaryText,
              fontSize: 14,
              fontWeight: FontWeight.w800,
            ),
          ),
          const Spacer(),
          TextButton(
            onPressed: onSelectAll,
            child: const Text('全选'),
          ),
          if (trashMode) ...[
            IconButton(
              tooltip: '恢复',
              onPressed: onRestore,
              icon: const Icon(Icons.restore_rounded),
              color: palette.secondaryText,
            ),
            IconButton(
              tooltip: '彻底删除',
              onPressed: onPermanentDelete,
              icon: const Icon(Icons.delete_forever_rounded),
              color: const Color(0xFFDC2626),
            ),
          ] else
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  tooltip: '加入分组',
                  onPressed: onMoveToFolder,
                  icon: const Icon(Icons.folder_open_rounded),
                  color: palette.secondaryText,
                ),
                IconButton(
                  tooltip: '删除',
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline_rounded),
                  color: const Color(0xFFDC2626),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _FolderTabs extends StatelessWidget {
  const _FolderTabs({
    required this.folders,
    required this.selectedFolderId,
    required this.onSelectAll,
    required this.onSelectFolder,
    required this.onAddFolder,
  });

  final List<FolderItem> folders;
  final String? selectedFolderId;
  final VoidCallback onSelectAll;
  final ValueChanged<String> onSelectFolder;
  final VoidCallback onAddFolder;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: context.palette.panelBackground,
      padding: const EdgeInsets.fromLTRB(16, 4, 0, 10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            _FolderChip(
              label: '全部',
              selected: selectedFolderId == null,
              onTap: onSelectAll,
            ),
            ...folders.map(
              (folder) => _FolderChip(
                label: folder.name,
                selected: selectedFolderId == folder.id,
                onTap: () => onSelectFolder(folder.id),
              ),
            ),
            _FolderAddChip(onTap: onAddFolder),
          ],
        ),
      ),
    );
  }
}

class _NotesDrawer extends StatelessWidget {
  const _NotesDrawer({
    required this.username,
    required this.avatarUrl,
    required this.notesCount,
    required this.favoritesCount,
    required this.trashCount,
    required this.storageUsage,
    required this.currentView,
    required this.themeMode,
    required this.onSelectAll,
    required this.onSelectFavorites,
    required this.onSelectShares,
    required this.onSelectTrash,
    required this.onSelectSettings,
    required this.onSelectThemeMode,
    required this.onLogout,
  });

  final String username;
  final String? avatarUrl;
  final int notesCount;
  final int favoritesCount;
  final int trashCount;
  final int storageUsage;
  final NotesWorkspaceView currentView;
  final ThemeMode themeMode;
  final Future<void> Function() onSelectAll;
  final Future<void> Function() onSelectFavorites;
  final Future<void> Function() onSelectShares;
  final Future<void> Function() onSelectTrash;
  final VoidCallback onSelectSettings;
  final ValueChanged<ThemeMode> onSelectThemeMode;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final resolvedUrl = _resolveAvatarUrl(avatarUrl);
    final drawerWidth =
        (MediaQuery.sizeOf(context).width * 0.64).clamp(236.0, 280.0);

    return Drawer(
      width: drawerWidth,
      backgroundColor: context.palette.drawerBackground,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          child: Column(
            children: [
              Expanded(
                child: ListView(
                  key: const Key('notes-drawer-scroll'),
                  padding: EdgeInsets.zero,
                  children: [
                    Row(
                      children: [
                        SizedBox(
                          width: 38,
                          height: 38,
                          child: ClipOval(
                            child: resolvedUrl != null
                                ? Image.network(
                                    resolvedUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) =>
                                        _AvatarFallback(username: username),
                                  )
                                : _AvatarFallback(username: username),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          username,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: context.palette.primaryText,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    _DrawerItem(
                      icon: Icons.description_outlined,
                      label: '全部笔记',
                      count: '$notesCount',
                      selected: currentView == NotesWorkspaceView.all,
                      onTap: onSelectAll,
                    ),
                    _DrawerItem(
                      icon: Icons.favorite_outline,
                      label: '收藏夹',
                      count: '$favoritesCount',
                      selected: currentView == NotesWorkspaceView.favorites,
                      onTap: onSelectFavorites,
                    ),
                    _DrawerItem(
                      icon: Icons.link_outlined,
                      label: '分享链接',
                      selected: currentView == NotesWorkspaceView.shares,
                      onTap: onSelectShares,
                    ),
                    _DrawerItem(
                      icon: Icons.delete_outline,
                      label: '废纸篓',
                      count: '$trashCount',
                      selected: currentView == NotesWorkspaceView.trash,
                      onTap: onSelectTrash,
                    ),
                    const SizedBox(height: 12),
                    _StorageSummaryCard(
                      notesCount: notesCount,
                      storageUsage: storageUsage,
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
              _DrawerSettingsCard(
                themeMode: themeMode,
                onChanged: onSelectThemeMode,
                onSettings: onSelectSettings,
              ),
              const SizedBox(height: 4),
              Center(
                child: TextButton.icon(
                  onPressed: onLogout,
                  icon: const Icon(Icons.logout_rounded, size: 15),
                  label: const Text('退出登录'),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFFC45C4E),
                    textStyle: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                    minimumSize: const Size(0, 30),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.count,
    this.selected = false,
  });

  final IconData icon;
  final String label;
  final String? count;
  final bool selected;
  final Future<void> Function() onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: selected ? palette.cardBackground : Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        boxShadow: selected
            ? [
                BoxShadow(
                  color: palette.cardShadow,
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          child: Row(
            children: [
              Icon(icon, size: 19, color: palette.secondaryText),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: palette.primaryText,
                  ),
                ),
              ),
              if (count != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: palette.chipBackground,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    count!,
                    style:
                        TextStyle(fontSize: 10.5, color: palette.secondaryText),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AvatarFallback extends StatelessWidget {
  const _AvatarFallback({required this.username});

  final String username;

  @override
  Widget build(BuildContext context) {
    final letter =
        username.isEmpty ? 'U' : username.characters.first.toUpperCase();
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF06B6D4), Color(0xFF2563EB)],
        ),
      ),
      child: Center(
        child: Text(
          letter,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _StorageSummaryCard extends StatelessWidget {
  const _StorageSummaryCard({
    required this.notesCount,
    required this.storageUsage,
  });

  final int notesCount;
  final int storageUsage;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final usageText = storageUsage <= 0
        ? '0 B'
        : storageUsage < 1024 * 1024
            ? '${(storageUsage / 1024).toStringAsFixed(1)} KB'
            : '${(storageUsage / 1024 / 1024).toStringAsFixed(2)} MB';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: palette.cardBackground,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: palette.cardBorder),
        boxShadow: [
          BoxShadow(
            color: palette.cardShadow,
            blurRadius: 12,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '存储空间',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    color: palette.primaryText,
                  ),
                ),
              ),
              Icon(Icons.bar_chart_rounded, size: 18, color: palette.mutedText),
            ],
          ),
          const SizedBox(height: 9),
          _StorageInfoRow(label: '总笔记数', value: '$notesCount'),
          const SizedBox(height: 5),
          _StorageInfoRow(label: '已用空间', value: usageText),
          const SizedBox(height: 9),
          _StorageHeatGrid(),
        ],
      ),
    );
  }
}

class _StorageInfoRow extends StatelessWidget {
  const _StorageInfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Row(
      children: [
        Expanded(
          child: Text(label,
              style: TextStyle(fontSize: 11, color: palette.secondaryText)),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: palette.primaryText,
          ),
        ),
      ],
    );
  }
}

class _StorageHeatGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    const activeIndexes = {5, 13, 21, 30, 38, 47, 55, 63, 76, 84, 92};

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(10, 11, 10, 10),
          decoration: BoxDecoration(
            color: palette.pageBackground,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: palette.cardBorder),
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              const columns = 14;
              const rows = 7;
              const gap = 3.0;
              final graphWidth = constraints.maxWidth;
              final cellSize = (graphWidth - gap * (columns - 1)) / columns;
              return Center(
                child: SizedBox(
                  width: graphWidth,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Column(
                        key: const Key('storage-heatmap-grid'),
                        mainAxisSize: MainAxisSize.min,
                        children: List.generate(rows, (row) {
                          return Padding(
                            padding: EdgeInsets.only(
                              bottom: row == rows - 1 ? 0 : gap,
                            ),
                            child: Row(
                              children: List.generate(columns, (column) {
                                final index = column * rows + row;
                                final active = activeIndexes.contains(index);
                                final date = DateTime.now().subtract(
                                  Duration(days: rows * columns - 1 - index),
                                );
                                final count = active ? 1 + (index % 4) : 0;
                                return Padding(
                                  padding: EdgeInsets.only(
                                    right: column == columns - 1 ? 0 : gap,
                                  ),
                                  child: Tooltip(
                                    message:
                                        '${date.year}/${date.month}/${date.day} · $count 条记录',
                                    child: Container(
                                      key: ValueKey(
                                          'storage-heatmap-cell-$index'),
                                      width: cellSize,
                                      height: cellSize,
                                      decoration: BoxDecoration(
                                        color: active
                                            ? const Color(0xFF89D7B4)
                                            : const Color(0xFFE8EEF5),
                                        borderRadius:
                                            BorderRadius.circular(2.4),
                                        border: active
                                            ? null
                                            : Border.all(
                                                color: const Color(0xFFD4DEE8),
                                              ),
                                      ),
                                    ),
                                  ),
                                );
                              }),
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 7),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '4月',
                            style: TextStyle(
                              fontSize: 10,
                              color: palette.mutedText,
                            ),
                          ),
                          Text(
                            '5月',
                            style: TextStyle(
                              fontSize: 10,
                              color: palette.mutedText,
                            ),
                          ),
                          Text(
                            '6月',
                            style: TextStyle(
                              fontSize: 10,
                              color: palette.mutedText,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _DrawerSettingsCard extends StatelessWidget {
  const _DrawerSettingsCard({
    required this.themeMode,
    required this.onChanged,
    required this.onSettings,
  });

  final ThemeMode themeMode;
  final ValueChanged<ThemeMode> onChanged;
  final VoidCallback onSettings;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: palette.cardBackground,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: palette.cardBorder),
        boxShadow: [
          BoxShadow(
            color: palette.cardShadow,
            blurRadius: 12,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: onSettings,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 1, vertical: 1),
              child: Row(
                children: [
                  Icon(Icons.settings_outlined,
                      size: 18, color: palette.secondaryText),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Text(
                      '设置',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: palette.primaryText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 9),
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: palette.chipBackground,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              children: [
                _ThemeIconSegment(
                  icon: Icons.wb_sunny_outlined,
                  selected: themeMode == ThemeMode.light,
                  onTap: () => onChanged(ThemeMode.light),
                ),
                _ThemeIconSegment(
                  icon: Icons.dark_mode_outlined,
                  selected: themeMode == ThemeMode.dark,
                  onTap: () => onChanged(ThemeMode.dark),
                ),
                _ThemeIconSegment(
                  icon: Icons.devices_outlined,
                  selected: themeMode == ThemeMode.system,
                  onTap: () => onChanged(ThemeMode.system),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ThemeIconSegment extends StatelessWidget {
  const _ThemeIconSegment({
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          height: 32,
          decoration: BoxDecoration(
            color: selected ? palette.cardBackground : Colors.transparent,
            borderRadius: BorderRadius.circular(999),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: palette.cardShadow,
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ]
                : null,
          ),
          child: Icon(
            icon,
            size: 16,
            color: selected ? palette.primaryText : palette.secondaryText,
          ),
        ),
      ),
    );
  }
}

class _FolderChip extends StatelessWidget {
  const _FolderChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: SizedBox(
        height: 38,
        child: FilledButton.tonal(
          onPressed: onTap,
          style: FilledButton.styleFrom(
            backgroundColor: selected
                ? palette.selectedChipBackground
                : palette.chipBackground,
            foregroundColor:
                selected ? palette.selectedChipText : palette.secondaryText,
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 0),
            elevation: 0,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: Text(
            label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
          ),
        ),
      ),
    );
  }
}

class _FolderAddChip extends StatelessWidget {
  const _FolderAddChip({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Tooltip(
      message: '新建分组',
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 38,
          height: 38,
          margin: const EdgeInsets.only(right: 0),
          decoration: BoxDecoration(
            color: palette.chipBackground,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(Icons.add, color: palette.secondaryText, size: 18),
        ),
      ),
    );
  }
}

class _NoteCard extends ConsumerWidget {
  const _NoteCard({
    required this.note,
    required this.onTap,
    required this.onLongPress,
    required this.selected,
    required this.selectionMode,
  });

  final NoteItem note;
  final VoidCallback onTap;
  final VoidCallback onLongPress;
  final bool selected;
  final bool selectionMode;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preview = extractPreviewData(note.content);
    final title = deriveDisplayTitle(note, preview);
    final subtitle = buildPreviewText(preview, title);
    final hasTitle = title.trim().isNotEmpty;
    final time = _formatCardTimestamp(note.updatedAt ?? note.createdAt);
    final heroImage = preview.image != null;
    final theme = _cardThemeForNote(context, note, preview);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        onLongPress: onLongPress,
        child: Stack(
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: theme.background,
                border: Border.all(
                  color: selected
                      ? context.palette.selectedChipBackground
                      : theme.borderColor,
                  width: selected ? 1.8 : 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: theme.shadowColor,
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (heroImage)
                      SizedBox(
                        height: 50,
                        width: double.infinity,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.network(
                              preview.image!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                color: const Color(0xFFCBD5E1),
                              ),
                            ),
                            Container(
                              decoration: const BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Color(0x19000000),
                                    Color(0xB320283B)
                                  ],
                                ),
                              ),
                            ),
                            Positioned(
                              top: 1,
                              right: 1,
                              child: _CardMenuButton(note: note),
                            ),
                          ],
                        ),
                      )
                    else if (preview.audio || preview.video)
                      Container(
                        height: 50,
                        width: double.infinity,
                        color: const Color(0xFF2B3448),
                        child: Stack(
                          children: [
                            Center(
                              child: Icon(
                                preview.audio
                                    ? Icons.music_note_outlined
                                    : Icons.movie_outlined,
                                color: Colors.white,
                                size: 24,
                              ),
                            ),
                            Positioned(
                              top: 1,
                              right: 1,
                              child: _CardMenuButton(note: note),
                            ),
                          ],
                        ),
                      )
                    else
                      SizedBox(
                        key: const Key('note-empty-media-header'),
                        height: 50,
                        width: double.infinity,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                theme.headerStartColor,
                                theme.headerEndColor,
                              ],
                            ),
                          ),
                          child: Align(
                            alignment: Alignment.topRight,
                            child: Padding(
                              padding: const EdgeInsets.only(top: 5, right: 5),
                              child: _CardMenuButton(note: note),
                            ),
                          ),
                        ),
                      ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(
                          10,
                          8,
                          10,
                          10,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (hasTitle)
                                  Text(
                                    title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: theme.titleColor,
                                      fontSize: 15,
                                      fontWeight: FontWeight.w800,
                                      height: 1.05,
                                    ),
                                  ),
                                if (subtitle.isNotEmpty) ...[
                                  if (hasTitle) const SizedBox(height: 4),
                                  Text(
                                    subtitle,
                                    maxLines: hasTitle ? 1 : 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: theme.subtitleColor,
                                      fontSize: hasTitle ? 11.5 : 13,
                                      height: 1.25,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            Row(
                              children: [
                                Icon(Icons.schedule,
                                    size: 11, color: theme.metaColor),
                                const SizedBox(width: 3),
                                Text(
                                  time,
                                  style: TextStyle(
                                      color: theme.metaColor, fontSize: 10.5),
                                ),
                                const Spacer(),
                                if (note.isFavorite)
                                  const Icon(Icons.favorite,
                                      size: 13, color: Color(0xFFFFCCAA)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (selectionMode)
              Positioned(
                top: 7,
                left: 7,
                child: Icon(
                  selected
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_unchecked_rounded,
                  size: 22,
                  color: selected
                      ? context.palette.selectedChipBackground
                      : context.palette.mutedText,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CardMenuButton extends ConsumerWidget {
  const _CardMenuButton({required this.note});

  final NoteItem note;
  static const _shareChannel = MethodChannel('mynote/share');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return IconButton(
      tooltip: '快捷操作',
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints.tightFor(width: 30, height: 30),
      style: IconButton.styleFrom(
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      icon: Icon(
        Icons.more_horiz,
        color: isDark ? const Color(0xD9FFFFFF) : const Color(0xFF98A2B3),
        size: 17,
      ),
      onPressed: () => _showQuickActions(context, ref),
    );
  }

  Future<void> _showQuickActions(BuildContext context, WidgetRef ref) async {
    final action = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return SafeArea(
          top: false,
          child: Container(
            margin: const EdgeInsets.fromLTRB(14, 0, 14, 12),
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
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
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _CompactSheetHeader(
                  title: '快捷操作',
                  onClose: () => Navigator.of(sheetContext).pop(),
                ),
                const SizedBox(height: 4),
                _CompactActionGrid(
                  actions: [
                    _CompactActionData(
                      value: 'favorite',
                      icon: note.isFavorite
                          ? Icons.favorite_rounded
                          : Icons.favorite_border_rounded,
                      label: note.isFavorite ? '取消收藏' : '收藏',
                    ),
                    _CompactActionData(
                      value: 'pin',
                      icon: note.isPinned
                          ? Icons.push_pin_rounded
                          : Icons.push_pin_outlined,
                      label: note.isPinned ? '取消置顶' : '置顶',
                    ),
                    const _CompactActionData(
                      value: 'image_share',
                      icon: Icons.image_outlined,
                      label: '图片分享',
                    ),
                    const _CompactActionData(
                      value: 'link_share',
                      icon: Icons.link_rounded,
                      label: '链接分享',
                    ),
                    const _CompactActionData(
                      value: 'folder',
                      icon: Icons.folder_open_rounded,
                      label: '加入分组',
                    ),
                    const _CompactActionData(
                      value: 'delete',
                      icon: Icons.delete_outline_rounded,
                      label: '删除',
                      destructive: true,
                    ),
                  ],
                  onSelected: (value) => Navigator.of(sheetContext).pop(value),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (action == null || !context.mounted) return;

    final repo = ref.read(notesRepositoryProvider);
    final palette = context.palette;
    switch (action) {
      case 'favorite':
        await repo.toggleFavorite(note.id);
        break;
      case 'pin':
        await repo.togglePin(note.id);
        break;
      case 'image_share':
        await _shareNoteImage(
          context: context,
          background: palette.cardBackground,
          titleColor: palette.primaryText,
          bodyColor: palette.secondaryText,
          footerColor: palette.mutedText,
        );
        break;
      case 'link_share':
        await _shareNoteLink(ref);
        break;
      case 'folder':
        await _moveToFolder(context, ref);
        break;
      case 'delete':
        await repo.delete(note.id);
        break;
    }
    if (context.mounted) {
      await ref.read(notesBoardViewModelProvider.notifier).reloadCurrent();
    }
  }

  Future<void> _moveToFolder(BuildContext context, WidgetRef ref) async {
    final folders = ref.read(notesBoardViewModelProvider).folders;
    final folder = await showFolderPickerSheet(
      context,
      folders: folders,
      currentFolderId: note.folderId,
    );
    if (folder == null) return;

    await ref.read(notesRepositoryProvider).update(
          id: note.id,
          title: note.title,
          content: note.content,
          folderId: folder.id,
        );
  }

  Future<void> _shareNoteLink(WidgetRef ref) async {
    final result = await ref.read(notesRepositoryProvider).share(note.id);
    final shareUrl = result['shareUrl']?.toString();
    if (shareUrl != null && shareUrl.isNotEmpty) {
      await Clipboard.setData(ClipboardData(text: shareUrl));
    }
  }

  Future<void> _shareNoteImage({
    required BuildContext context,
    required Color background,
    required Color titleColor,
    required Color bodyColor,
    required Color footerColor,
  }) async {
    final preview = extractPreviewData(note.content);
    final title = deriveDisplayTitle(note, preview);
    final body = buildPreviewText(preview, title);
    final bytes = await renderShareCardImage(
      title: title.trim().isEmpty ? 'MyNote' : title.trim(),
      body: body,
      htmlContent: note.content,
      coverImageUrl: preview.image,
      footer: 'MyNote',
      background: background,
      titleColor: titleColor,
      bodyColor: bodyColor,
      footerColor: footerColor,
    );
    if (!context.mounted) return;
    final confirmed = await showShareImagePreview(context, bytes: bytes);
    if (!confirmed) return;
    await _shareChannel.invokeMethod<void>('shareNoteImage', {
      'filename': 'mynote-${note.id}.png',
      'bytes': bytes,
    });
  }
}

class _SharedLinksList extends StatelessWidget {
  const _SharedLinksList({required this.links});

  final List<Map<String, dynamic>> links;

  @override
  Widget build(BuildContext context) {
    if (links.isEmpty) {
      return const _EmptyState(message: '暂无分享链接');
    }

    return ListView.separated(
      padding: const EdgeInsets.only(bottom: 100),
      itemCount: links.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final link = links[index];
        return _SharedLinkCard(link: link);
      },
    );
  }
}

class _CompactSheetHeader extends StatelessWidget {
  const _CompactSheetHeader({required this.title, required this.onClose});

  final String title;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Row(
      children: [
        Text(
          title,
          style: TextStyle(
            color: palette.primaryText,
            fontSize: 15,
            fontWeight: FontWeight.w800,
          ),
        ),
        const Spacer(),
        IconButton(
          tooltip: '关闭',
          onPressed: onClose,
          icon: const Icon(Icons.close_rounded),
          color: palette.secondaryText,
          constraints: const BoxConstraints.tightFor(width: 32, height: 32),
          padding: EdgeInsets.zero,
          style: IconButton.styleFrom(
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ),
      ],
    );
  }
}

class _CompactActionData {
  const _CompactActionData({
    required this.value,
    required this.icon,
    required this.label,
    this.destructive = false,
  });

  final String value;
  final IconData icon;
  final String label;
  final bool destructive;
}

class _CompactActionGrid extends StatelessWidget {
  const _CompactActionGrid({
    required this.actions,
    required this.onSelected,
  });

  final List<_CompactActionData> actions;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 72,
      child: Row(
        key: const Key('quick-actions-row'),
        children: [
          for (var index = 0; index < actions.length; index++) ...[
            Expanded(
              child: _CompactActionTile(
                action: actions[index],
                onSelected: onSelected,
              ),
            ),
            if (index != actions.length - 1) const SizedBox(width: 5),
          ],
        ],
      ),
    );
  }
}

class _CompactActionTile extends StatelessWidget {
  const _CompactActionTile({
    required this.action,
    required this.onSelected,
  });

  final _CompactActionData action;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final foreground = action.destructive
        ? const Color(0xFFDC2626)
        : context.palette.primaryText;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => onSelected(action.value),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: context.palette.chipBackground,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.palette.cardBorder),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(action.icon, size: 18, color: foreground),
              const SizedBox(height: 5),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  action.label,
                  maxLines: 1,
                  softWrap: false,
                  style: TextStyle(
                    color: foreground,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SharedLinkCard extends ConsumerWidget {
  const _SharedLinkCard({required this.link});

  final Map<String, dynamic> link;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = context.palette;
    final expiresAt = link['expiresAt']?.toString();
    final expired = link['expired'] == true;
    final title = '${link['title'] ?? '无标题笔记'}';
    final preview = extractPreviewData(link['content']?.toString() ?? '');
    final previewSubtitle = buildPreviewText(preview, title);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: palette.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: palette.cardBorder),
        boxShadow: [
          BoxShadow(
            color: palette.cardShadow,
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SharePreviewThumb(
            title: title,
            preview: preview,
            subtitle: previewSubtitle,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: palette.primaryText,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${link['shareUrl'] ?? ''}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.3,
                    color: palette.secondaryText,
                  ),
                ),
                const SizedBox(height: 7),
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: expired
                            ? const Color(0xFFA8B2C0)
                            : const Color(0xFF20BF6B),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      expired ? '已过期' : '生效中',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: palette.secondaryText,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        '到期：${_formatShareExpiresAt(expiresAt)}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          color: palette.mutedText,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    SizedBox(
                      height: 34,
                      child: FilledButton(
                        onPressed: () async {
                          final text = '${link['shareUrl'] ?? ''}';
                          await Clipboard.setData(ClipboardData(text: text));
                        },
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 15),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('复制'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    SizedBox(
                      height: 34,
                      child: OutlinedButton(
                        onPressed: () => ref
                            .read(notesBoardViewModelProvider.notifier)
                            .revokeShareLink('${link['id'] ?? ''}'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 15),
                          foregroundColor: const Color(0xFFFF4A55),
                          side: const BorderSide(color: Color(0xFFFFC8CD)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('关闭'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SharePreviewThumb extends StatelessWidget {
  const _SharePreviewThumb({
    required this.title,
    required this.preview,
    required this.subtitle,
  });

  final String title;
  final NotePreviewData preview;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 74,
        height: 84,
        color: const Color(0xFFF2F5F9),
        child: preview.image == null
            ? Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 10,
                        height: 1.15,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      subtitle.isEmpty ? 'MyNote' : subtitle,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 8.5,
                        height: 1.18,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              )
            : Image.network(
                preview.image!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const ColoredBox(
                  color: Color(0xFFE2E8F0),
                ),
              ),
      ),
    );
  }
}

class _SettingsPanel extends ConsumerStatefulWidget {
  const _SettingsPanel({required this.user});

  final UserProfile? user;

  @override
  ConsumerState<_SettingsPanel> createState() => _SettingsPanelState();
}

class _SettingsPanelState extends ConsumerState<_SettingsPanel> {
  late final TextEditingController _usernameController;
  late final TextEditingController _trashRetentionController;
  late final TextEditingController _shareRetentionController;
  late final TextEditingController _serverController;
  bool _checkingUpdate = false;

  @override
  void initState() {
    super.initState();
    _usernameController =
        TextEditingController(text: widget.user?.username ?? '');
    _trashRetentionController = TextEditingController(
      text: '${widget.user?.trashRetentionDays ?? 30}',
    );
    _shareRetentionController = TextEditingController(
      text: '${widget.user?.shareRetentionDays ?? 30}',
    );
    _serverController = TextEditingController();
    Future<void>.microtask(() async {
      final value = await ref.read(serverSettingsStorageProvider).readBaseUrl();
      if (mounted) {
        _serverController.text = value;
      }
    });
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _trashRetentionController.dispose();
    _shareRetentionController.dispose();
    _serverController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final state = ref.watch(notesBoardViewModelProvider);
    final noteFontSize = ref.watch(noteFontSizeProvider);
    final usageText = _formatStorageSize(state.storageUsageBytes);

    return Container(
      color: palette.pageBackground,
      child: Column(
        children: [
          _PanelHeader(
            title: '设置中心',
            subtitle: '管理你的存储与偏好',
            onBack: () =>
                ref.read(notesBoardViewModelProvider.notifier).backToBoard(),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              children: [
                _AccountSettingsCard(
                  user: widget.user,
                  onRename: () => _showUsernameDialog(context),
                  onAvatar: () => _showAvatarDialog(context),
                ),
                const SizedBox(height: 16),
                // 存储空间卡片
                _SettingsCard(
                  title: '',
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('存储空间',
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: palette.secondaryText)),
                      const SizedBox(height: 12),
                      Text(usageText,
                          style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              color: palette.primaryText)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                // 四宫格统计
                Row(
                  children: [
                    Expanded(
                        child: _StatCard(
                            label: '笔记总数',
                            value: '${state.notesCount}',
                            color: const Color(0xFF0F172A))),
                    const SizedBox(width: 12),
                    const Expanded(
                        child: _StatCard(
                            label: '字符统计',
                            value: '428k',
                            color: Color(0xFF0F172A))),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                        child: _StatCard(
                            label: '收藏项',
                            value: '${state.favoritesCount}',
                            color: const Color(0xFF0F172A))),
                    const SizedBox(width: 12),
                    Expanded(
                        child: _StatCard(
                            label: '废纸篓',
                            value: '${state.trashCount}',
                            color: const Color(0xFFEF4444))),
                  ],
                ),
                const SizedBox(height: 24),
                Text('偏好设置',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: palette.primaryText)),
                const SizedBox(height: 12),
                _PreferenceItem(
                  icon: Icons.delete_outline,
                  label: '废纸篓清理',
                  value: '${widget.user?.trashRetentionDays ?? 30}天',
                  onTap: () => _showRetentionDaysDialog(
                    context: context,
                    title: '废纸篓清理',
                    initialValue: widget.user?.trashRetentionDays ?? 30,
                    onConfirm: (days) => ref
                        .read(authViewModelProvider.notifier)
                        .updateSettings(trashRetentionDays: days),
                  ),
                ),
                _PreferenceItem(
                  icon: Icons.access_time,
                  label: '链接有效期',
                  value: '${widget.user?.shareRetentionDays ?? 7}天',
                  onTap: () => _showRetentionDaysDialog(
                    context: context,
                    title: '链接有效期',
                    initialValue: widget.user?.shareRetentionDays ?? 7,
                    onConfirm: (days) => ref
                        .read(authViewModelProvider.notifier)
                        .updateSettings(shareRetentionDays: days),
                  ),
                ),
                _PreferenceItem(
                  icon: Icons.format_size_rounded,
                  label: '笔记字体大小',
                  value: noteFontSize.label,
                  onTap: () => _showNoteFontSizeSheet(context, ref),
                ),
                const SizedBox(height: 24),
                // 导入笔记
                _BigActionCard(
                  title: '导入笔记',
                  desc: '支持导入 .md, .markdown, .txt 文件，每次导入一个文件为一篇新笔记。',
                  btnLabel: '选择文件导入',
                  icon: Icons.cloud_upload_outlined,
                  onTap: () {},
                ),
                const SizedBox(height: 16),
                // 安全设置
                _BigActionCard(
                  title: '安全设置',
                  desc: '建议定期更新密码，保护账号安全。',
                  btnLabel: '修改密码',
                  icon: Icons.lock_outline,
                  onTap: () {},
                ),
                const SizedBox(height: 16),
                _SettingsCard(
                  title: '关于 MyNote',
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _AboutSettingRow(
                        icon: Icons.info_outline,
                        label: '当前版本',
                        value: 'v$_appVersion',
                      ),
                      _AboutSettingRow(
                        icon: Icons.code_rounded,
                        label: 'GitHub 地址',
                        value: _githubUrl,
                        onTap: () => _copyGithubUrl(context),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: FilledButton.icon(
                          onPressed: _checkingUpdate
                              ? null
                              : () => _checkForUpdate(context),
                          icon: const Icon(Icons.system_update_alt_rounded),
                          label: Text(_checkingUpdate ? '检查中...' : '检查更新'),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                Center(
                  child: Column(
                    children: [
                      const Text('V $_appVersion • © 2026 MyNote',
                          style: TextStyle(
                              fontSize: 11, color: Color(0xFF94A3B8))),
                      const SizedBox(height: 4),
                      Text('服务器：${_serverController.text}',
                          style: const TextStyle(
                              fontSize: 10, color: Color(0xFFCBD5E1))),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showUsernameDialog(BuildContext context) async {
    _usernameController.text = widget.user?.username ?? '';
    final username = await showDialog<String>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('修改用户名'),
          content: TextField(
            controller: _usernameController,
            autofocus: true,
            textInputAction: TextInputAction.done,
            decoration: const InputDecoration(
              labelText: '用户名',
              hintText: '请输入新的用户名',
            ),
            onSubmitted: (value) =>
                Navigator.of(dialogContext).pop(value.trim()),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('取消'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext)
                  .pop(_usernameController.text.trim()),
              child: const Text('保存'),
            ),
          ],
        );
      },
    );

    if (username == null || username.isEmpty || !context.mounted) return;
    await ref
        .read(authViewModelProvider.notifier)
        .updateSettings(username: username);
    if (!context.mounted) return;
    showAppSnackBar(context, '用户名已更新');
  }

  Future<void> _showAvatarDialog(BuildContext context) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('修改头像'),
          content: const Text('头像上传接口已接入，下一步会接入系统图片选择器。'),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('知道了'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _copyGithubUrl(BuildContext context) async {
    await Clipboard.setData(const ClipboardData(text: _githubUrl));
    if (!context.mounted) return;
    showAppSnackBar(context, 'GitHub 地址已复制');
  }

  Future<void> _checkForUpdate(BuildContext context) async {
    setState(() => _checkingUpdate = true);
    try {
      final response = await Dio().get<Map<String, dynamic>>(
        _githubLatestReleaseApi,
        options: Options(
          headers: const {'Accept': 'application/vnd.github+json'},
          validateStatus: (status) => status != null && status < 500,
        ),
      );

      if (response.statusCode == 404) {
        if (context.mounted) showAppSnackBar(context, '暂无可用发布版本');
        return;
      }
      if (response.statusCode == null || response.statusCode! >= 400) {
        throw Exception('GitHub 返回 ${response.statusCode}');
      }

      final latest = response.data?['tag_name']?.toString() ?? '';
      if (latest.isEmpty) {
        if (context.mounted) showAppSnackBar(context, '暂无可用发布版本');
        return;
      }

      if (_compareVersions(latest, _appVersion) > 0) {
        if (context.mounted) {
          showAppSnackBar(context, '发现新版本 $latest，请前往 GitHub 下载');
        }
      } else if (context.mounted) {
        showAppSnackBar(context, '当前已是最新版本 v$_appVersion');
      }
    } catch (error) {
      if (context.mounted) showAppSnackBar(context, '检查更新失败: $error');
    } finally {
      if (mounted) setState(() => _checkingUpdate = false);
    }
  }
}

class _AboutSettingRow extends StatelessWidget {
  const _AboutSettingRow({
    required this.icon,
    required this.label,
    required this.value,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final surface = Theme.of(context).colorScheme.surface;
    final content = Container(
      constraints: const BoxConstraints(minHeight: 48),
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: palette.secondaryText),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: palette.primaryText,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: onTap == null
                    ? palette.secondaryText
                    : palette.selectedChipBackground,
              ),
            ),
          ),
        ],
      ),
    );

    if (onTap == null) return content;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: content,
    );
  }
}

class _AccountSettingsCard extends StatelessWidget {
  const _AccountSettingsCard({
    required this.user,
    required this.onRename,
    required this.onAvatar,
  });

  final UserProfile? user;
  final VoidCallback onRename;
  final VoidCallback onAvatar;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final username = user?.username ?? '用户';
    final resolvedUrl = _resolveAvatarUrl(user?.avatar);

    return _SettingsCard(
      title: '',
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: SizedBox(
                  width: 54,
                  height: 54,
                  child: resolvedUrl == null
                      ? _AvatarFallback(username: username)
                      : Image.network(
                          resolvedUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              _AvatarFallback(username: username),
                        ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '账号信息',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: palette.secondaryText,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      username,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: palette.primaryText,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _SmallAccountButton(
                  icon: Icons.edit_outlined,
                  label: '修改用户名',
                  onTap: onRename,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _SmallAccountButton(
                  icon: Icons.photo_camera_outlined,
                  label: '修改头像',
                  onTap: onAvatar,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SmallAccountButton extends StatelessWidget {
  const _SmallAccountButton({
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Tooltip(
      message: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 38,
          decoration: BoxDecoration(
            color: isDark ? palette.chipBackground : const Color(0xFFEAF2FF),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark ? palette.cardBorder : const Color(0xFFCFE0F7),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: palette.selectedChipBackground),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: palette.selectedChipBackground,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard(
      {required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: palette.cardBackground,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: palette.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: palette.mutedText)),
          const SizedBox(height: 8),
          Text(value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: color == const Color(0xFF0F172A)
                    ? palette.primaryText
                    : color,
              )),
        ],
      ),
    );
  }
}

class _PreferenceItem extends StatelessWidget {
  const _PreferenceItem(
      {required this.icon,
      required this.label,
      required this.value,
      required this.onTap});
  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: palette.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: palette.cardBorder),
      ),
      child: ListTile(
        dense: true,
        leading: Icon(icon, size: 20, color: palette.secondaryText),
        title: Text(label,
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: palette.primaryText)),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(value,
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: palette.selectedChipBackground)),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right, size: 16, color: palette.mutedText),
          ],
        ),
        onTap: onTap,
      ),
    );
  }
}

class _BigActionCard extends StatelessWidget {
  const _BigActionCard(
      {required this.title,
      required this.desc,
      required this.btnLabel,
      required this.icon,
      required this.onTap});
  final String title;
  final String desc;
  final String btnLabel;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: palette.cardBackground,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: palette.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: palette.primaryText)),
          const SizedBox(height: 12),
          Text(desc,
              style: TextStyle(
                  fontSize: 12, height: 1.5, color: palette.secondaryText)),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton.icon(
              onPressed: onTap,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              icon: Icon(icon, size: 18),
              label: Text(btnLabel,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w800)),
            ),
          ),
        ],
      ),
    );
  }
}

class _NoteCardTheme {
  const _NoteCardTheme({
    required this.background,
    required this.headerStartColor,
    required this.headerEndColor,
    required this.borderColor,
    required this.shadowColor,
    required this.titleColor,
    required this.subtitleColor,
    required this.metaColor,
  });

  final Gradient background;
  final Color headerStartColor;
  final Color headerEndColor;
  final Color borderColor;
  final Color shadowColor;
  final Color titleColor;
  final Color subtitleColor;
  final Color metaColor;
}

_NoteCardTheme _cardThemeForNote(
  BuildContext context,
  NoteItem note,
  NotePreviewData preview,
) {
  final palette = context.palette;
  final isDark = Theme.of(context).brightness == Brightness.dark;
  if (preview.image != null) {
    if (!isDark) {
      return _NoteCardTheme(
        background: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFFFFF), Color(0xFFF8FAFC)],
        ),
        headerStartColor: const Color(0xFFF8FAFC),
        headerEndColor: const Color(0xFFEFF4FA),
        borderColor: palette.cardBorder,
        shadowColor: palette.cardShadow,
        titleColor: palette.primaryText,
        subtitleColor: palette.secondaryText,
        metaColor: palette.mutedText,
      );
    }
    return _NoteCardTheme(
      background: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [palette.noteGradientStart, palette.noteGradientEnd],
      ),
      headerStartColor: palette.noteGradientStart,
      headerEndColor: palette.noteGradientEnd,
      borderColor: palette.cardBorder,
      shadowColor: palette.cardShadow,
      titleColor: Colors.white,
      subtitleColor: const Color(0xC2FFFFFF),
      metaColor: const Color(0xB8FFFFFF),
    );
  }
  if (preview.audio || preview.video) {
    if (!isDark) {
      return _NoteCardTheme(
        background: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFFFFF), Color(0xFFF8FAFC)],
        ),
        headerStartColor: const Color(0xFFF8FAFC),
        headerEndColor: const Color(0xFFEFF4FA),
        borderColor: palette.cardBorder,
        shadowColor: palette.cardShadow,
        titleColor: palette.primaryText,
        subtitleColor: palette.secondaryText,
        metaColor: palette.mutedText,
      );
    }
    return _NoteCardTheme(
      background: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [palette.noteGradientStart, palette.noteGradientEnd],
      ),
      headerStartColor: palette.noteGradientStart,
      headerEndColor: palette.noteGradientEnd,
      borderColor: palette.cardBorder,
      shadowColor: palette.cardShadow,
      titleColor: Colors.white,
      subtitleColor: const Color(0xC2FFFFFF),
      metaColor: const Color(0xB8FFFFFF),
    );
  }
  if (!isDark) {
    return _NoteCardTheme(
      background: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [palette.cardBackground, const Color(0xFFEAF0F8)],
      ),
      headerStartColor: const Color(0xFFF4F7FB),
      headerEndColor: const Color(0xFFE3EAF4),
      borderColor: palette.cardBorder,
      shadowColor: palette.cardShadow,
      titleColor: palette.primaryText,
      subtitleColor: palette.secondaryText,
      metaColor: palette.mutedText,
    );
  }

  return _NoteCardTheme(
    background: LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [palette.noteGradientStart, palette.noteGradientEnd],
    ),
    headerStartColor: palette.noteGradientStart,
    headerEndColor: palette.noteGradientEnd,
    borderColor: palette.cardBorder,
    shadowColor: palette.cardShadow,
    titleColor: Colors.white,
    subtitleColor: const Color(0xC2FFFFFF),
    metaColor: const Color(0xB8FFFFFF),
  );
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({this.message = '暂无笔记'});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFE6ECF4)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0F0F172A),
              blurRadius: 18,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.inbox_outlined,
                size: 42, color: Color(0xFF98A2B3)),
            const SizedBox(height: 12),
            Text(
              message,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Color(0xFF667085),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

String? _resolveAvatarUrl(String? avatarUrl) {
  if (avatarUrl == null || avatarUrl.isEmpty) {
    return null;
  }
  if (avatarUrl.startsWith('http')) {
    return avatarUrl;
  }
  return 'http://192.168.31.63:3665$avatarUrl';
}

String _formatCardTimestamp(DateTime? date) {
  if (date == null) return '-';
  final now = DateTime.now();
  final todayStart = DateTime(now.year, now.month, now.day);
  final dateStart = DateTime(date.year, date.month, date.day);
  final diffDays = todayStart.difference(dateStart).inDays;
  final time = DateFormat('HH:mm').format(date);
  if (diffDays == 0) return '今天 $time';
  if (diffDays == 1) return '昨天 $time';
  if (diffDays < 7) return '$diffDays天前';
  return DateFormat('M/d').format(date);
}

String _formatShareExpiresAt(String? value) {
  if (value == null || value.trim().isEmpty) return '-';
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;
  return DateFormat('yyyy-MM-dd HH:mm').format(parsed.toLocal());
}

class _PanelHeader extends StatelessWidget {
  const _PanelHeader({
    required this.title,
    required this.subtitle,
    required this.onBack,
  });

  final String title;
  final String subtitle;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Container(
      color: palette.panelBackground,
      padding: const EdgeInsets.fromLTRB(8, 12, 16, 14),
      child: Row(
        children: [
          IconButton(
            tooltip: '返回',
            onPressed: onBack,
            icon: Icon(Icons.arrow_back_ios_new_rounded,
                color: palette.secondaryText),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF2563EB),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(fontSize: 11, color: palette.mutedText),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({required this.title, required this.child, this.padding});

  final String title;
  final Widget child;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Container(
      padding: padding ?? const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: palette.cardBackground,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: palette.cardBorder),
        boxShadow: [
          BoxShadow(
            color: palette.cardShadow,
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title.isNotEmpty) ...[
            Text(
              title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: palette.primaryText,
              ),
            ),
            const SizedBox(height: 12),
          ],
          child,
        ],
      ),
    );
  }
}

String _formatStorageSize(int bytes) {
  if (bytes <= 0) return '0 B';
  const kb = 1024;
  const mb = kb * 1024;
  const gb = mb * 1024;
  if (bytes >= gb) return '${(bytes / gb).toStringAsFixed(2)} GB';
  if (bytes >= mb) return '${(bytes / mb).toStringAsFixed(2)} MB';
  if (bytes >= kb) return '${(bytes / kb).toStringAsFixed(1)} KB';
  return '$bytes B';
}

Future<void> _showRetentionDaysDialog({
  required BuildContext context,
  required String title,
  required int initialValue,
  required Future<void> Function(int days) onConfirm,
}) async {
  final controller = TextEditingController(text: '$initialValue');
  final days = await showDialog<int>(
    context: context,
    builder: (dialogContext) {
      return AlertDialog(
        title: Text(title),
        content: SizedBox(
          height: 180,
          child: CupertinoPicker(
            itemExtent: 42,
            scrollController: FixedExtentScrollController(
              initialItem: initialValue.clamp(1, 365) - 1,
            ),
            onSelectedItemChanged: (index) {
              controller.text = '${index + 1}';
            },
            children: List.generate(
              365,
              (index) => Center(child: Text('${index + 1} 天')),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () {
              final value = int.tryParse(controller.text.trim());
              if (value == null || value <= 0) return;
              Navigator.of(dialogContext).pop(value);
            },
            child: const Text('保存'),
          ),
        ],
      );
    },
  );
  controller.dispose();
  if (days == null || !context.mounted) return;

  await onConfirm(days);
  if (!context.mounted) return;
  showAppSnackBar(context, '偏好设置已保存');
}

Future<void> _showNoteFontSizeSheet(BuildContext context, WidgetRef ref) async {
  final selected = await showModalBottomSheet<NoteFontSize>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) {
      final palette = sheetContext.palette;
      final current = ref.read(noteFontSizeProvider);
      return SafeArea(
        top: false,
        child: Container(
          margin: const EdgeInsets.fromLTRB(14, 0, 14, 12),
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
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _CompactSheetHeader(
                title: '笔记字体大小',
                onClose: () => Navigator.of(sheetContext).pop(),
              ),
              const SizedBox(height: 8),
              ...NoteFontSize.values.map(
                (size) => ListTile(
                  key: ValueKey('note-font-size-${size.storageValue}'),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  leading: Icon(
                    Icons.format_size_rounded,
                    color: size == current
                        ? palette.selectedChipBackground
                        : palette.secondaryText,
                  ),
                  title: Text(
                    size.label,
                    style: TextStyle(
                      color: palette.primaryText,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  trailing: size == current
                      ? Icon(
                          Icons.check_rounded,
                          color: palette.selectedChipBackground,
                        )
                      : null,
                  onTap: () => Navigator.of(sheetContext).pop(size),
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
  if (selected == null || !context.mounted) return;

  await ref.read(noteFontSizeProvider.notifier).setFontSize(selected);
  if (!context.mounted) return;
  showAppSnackBar(context, '偏好设置已保存');
}
