import 'dart:async';

import 'package:appflowy_editor/appflowy_editor.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/data/mappers/editor_html_mapper.dart';
import 'package:mynote_android/data/services/editor_autosave_service.dart';
import 'package:mynote_android/domain/entities/folder_item.dart';
import 'package:mynote_android/domain/entities/note_item.dart';
import 'package:mynote_android/domain/entities/user_profile.dart';
import 'package:mynote_android/domain/repositories/auth_repository.dart';
import 'package:mynote_android/domain/repositories/folders_repository.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';
import 'package:mynote_android/ui/viewmodels/auth_view_model.dart';
import 'package:mynote_android/ui/viewmodels/notes_board_view_model.dart';
import 'package:mynote_android/ui/views/notes/notes_board_view.dart';

void main() {
  testWidgets('notes board uses compact grid spacing and tighter note cards',
      (tester) async {
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(_FakeNotesRepository()),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    container.read(authViewModelProvider.notifier).debugSetProfile(
          const UserProfile(
            id: 'u1',
            username: 'tester',
            email: 'tester@example.com',
            isAdmin: false,
          ),
        );

    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    expect(find.text('第一条笔记'), findsOneWidget);

    expect(find.byType(GridView), findsOneWidget);

    final grid = tester.widget<GridView>(find.byType(GridView));
    expect(
      grid.padding,
      const EdgeInsets.fromLTRB(10, 6, 10, 96),
    );

    final delegate =
        grid.gridDelegate as SliverGridDelegateWithFixedCrossAxisCount;
    expect(delegate.mainAxisSpacing, 6);
    expect(delegate.crossAxisSpacing, 6);
  });

  testWidgets('notes board keeps current notes visible while reloading',
      (tester) async {
    final repository = _FakeNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(repository),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );

    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    expect(find.text('第一条笔记'), findsWidgets);

    repository.pauseNextFetch();
    final reload =
        container.read(notesBoardViewModelProvider.notifier).loadFavorites();
    await tester.pump();

    expect(find.text('第一条笔记'), findsWidgets);
    expect(find.byType(GridView), findsWidgets);
    expect(find.byType(CircularProgressIndicator), findsNothing);

    repository.releaseFetch();
    await reload;
    await tester.pumpAndSettle();
  });

  testWidgets('notes board search icon opens search and filters notes',
      (tester) async {
    final repository = _FakeNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(repository),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('搜索'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('notes-search-field')), findsOneWidget);

    await tester.enterText(find.byKey(const Key('notes-search-field')), '第二');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();

    expect(repository.lastSearchQuery, '第二');
    expect(find.text('第二条笔记'), findsOneWidget);
    expect(find.text('第一条笔记'), findsNothing);
  });

  testWidgets('notes board pull to refresh reloads current notes',
      (tester) async {
    final repository = _FakeNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(repository),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    expect(repository.fetchAllCount, 1);
    expect(find.byType(RefreshIndicator), findsOneWidget);

    await tester.drag(find.byType(GridView), const Offset(0, 360));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();

    expect(repository.fetchAllCount, greaterThanOrEqualTo(2));
  });

  testWidgets('notes board error state offers local data mode', (tester) async {
    final repository = _FakeNotesRepository(failFetch: true);
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(repository),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    expect(find.text('使用本地数据'), findsOneWidget);
  });

  testWidgets('notes board 404 error does not offer local data mode',
      (tester) async {
    final repository = _FakeNotesRepository(
      fetchError: DioException(
        requestOptions: RequestOptions(path: '/notes'),
        response: Response(
          requestOptions: RequestOptions(path: '/notes'),
          statusCode: 404,
        ),
        type: DioExceptionType.badResponse,
      ),
    );
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(repository),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    expect(find.textContaining('接口不存在'), findsOneWidget);
    expect(find.text('使用本地数据'), findsNothing);
    expect(find.textContaining('DioException'), findsNothing);
  });

  testWidgets('create note fab only appears on the home notes view',
      (tester) async {
    final repository = _FakeNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(repository),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    expect(find.byTooltip('新建笔记'), findsOneWidget);

    await container.read(notesBoardViewModelProvider.notifier).loadFavorites();
    await tester.pumpAndSettle();

    expect(find.byTooltip('新建笔记'), findsNothing);

    await container.read(notesBoardViewModelProvider.notifier).loadTrash();
    await tester.pumpAndSettle();

    expect(find.byTooltip('新建笔记'), findsNothing);
  });

  testWidgets('pinned default cards keep the default card tone',
      (tester) async {
    final repository = _FakeNotesRepository(pinnedFirst: true);
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(repository),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    final header = tester.widget<DecoratedBox>(
      find.descendant(
        of: find.byKey(const Key('note-empty-media-header')).first,
        matching: find.byType(DecoratedBox),
      ),
    );
    final decoration = header.decoration as BoxDecoration;
    final gradient = decoration.gradient as LinearGradient;

    expect(gradient.colors, isNot(contains(const Color(0xFF2F67F8))));
    expect(gradient.colors, isNot(contains(const Color(0xFF1F56E0))));
  });

  testWidgets('long press starts multi select on notes, favorites, and trash',
      (tester) async {
    final repository = _FakeNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(repository),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    await tester.longPress(find.text('第一条笔记'));
    await tester.pumpAndSettle();
    expect(find.text('已选择 1 项'), findsOneWidget);
    expect(find.byIcon(Icons.check_circle_rounded), findsOneWidget);

    await tester.tap(find.byTooltip('取消多选'));
    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).loadFavorites();
    await tester.pumpAndSettle();

    await tester.longPress(find.text('收藏笔记'));
    await tester.pumpAndSettle();
    expect(find.text('已选择 1 项'), findsOneWidget);

    await tester.tap(find.byTooltip('取消多选'));
    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).loadTrash();
    await tester.pumpAndSettle();

    await tester.longPress(find.text('废纸篓笔记'));
    await tester.pumpAndSettle();
    expect(find.text('已选择 1 项'), findsOneWidget);
  });

  testWidgets('multi select can move home notes into a folder', (tester) async {
    final repository = _FakeNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(repository),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    await tester.longPress(find.text('第一条笔记'));
    await tester.pumpAndSettle();

    expect(find.byTooltip('加入分组'), findsOneWidget);

    await tester.tap(find.byTooltip('加入分组'));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('folder-picker-f1')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('folder-picker-f1')));
    await tester.pumpAndSettle();

    expect(repository.updatedFolderIds, contains('f1'));
    expect(find.text('已选择 1 项'), findsNothing);
  });

  testWidgets('folder add chip opens a compact bottom input', (tester) async {
    final foldersRepository = _FakeFoldersRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(_FakeNotesRepository()),
          foldersRepositoryProvider.overrideWithValue(foldersRepository),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('新建分组'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('create-folder-sheet')), findsOneWidget);
    expect(find.byKey(const Key('create-folder-field')), findsOneWidget);

    final sheetSize =
        tester.getSize(find.byKey(const Key('create-folder-sheet')));
    expect(sheetSize.height, inInclusiveRange(92, 132));

    final fieldContainer = tester.widget<DecoratedBox>(
      find.byKey(const Key('create-folder-field-shell')),
    );
    final decoration = fieldContainer.decoration as BoxDecoration;
    expect(decoration.border, isA<Border>());
    expect(decoration.borderRadius, BorderRadius.circular(16));

    await tester.enterText(find.byKey(const Key('create-folder-field')), '工作');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();

    expect(foldersRepository.createdName, '工作');
  });

  testWidgets('note cards use a visible empty media header tone',
      (tester) async {
    final repository = _FakeNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          notesRepositoryProvider.overrideWithValue(repository),
          foldersRepositoryProvider.overrideWithValue(_FakeFoldersRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: NotesBoardView(),
        ),
      ),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NotesBoardView)),
    );
    await tester.pumpAndSettle();
    await container.read(notesBoardViewModelProvider.notifier).load();
    await tester.pumpAndSettle();

    final headerDecoration = tester.widget<DecoratedBox>(
      find
          .descendant(
            of: find.byKey(const Key('note-empty-media-header')).first,
            matching: find.byType(DecoratedBox),
          )
          .first,
    );
    final decoration = headerDecoration.decoration as BoxDecoration;
    final gradient = decoration.gradient as LinearGradient;
    expect(gradient.colors.last, const Color(0xFFE3EAF4));
  });
}

class _FakeAuthRepository implements AuthRepository {
  @override
  Future<UserProfile?> getProfile() async => const UserProfile(
        id: 'u1',
        username: 'tester',
        email: 'tester@example.com',
        isAdmin: false,
      );

  @override
  Future<Map<String, dynamic>> getCaptcha() async =>
      const {'id': 'c', 'image': ''};

  @override
  Future<void> login({
    required String username,
    required String password,
  }) async {}

  @override
  Future<void> logout() async {}

  @override
  Future<void> register({
    required String username,
    required String password,
    required String captchaId,
    required String captchaText,
  }) async {}

  @override
  Future<String?> readToken() async => 'token';

  @override
  Future<UserProfile?> updateSettings({
    String? username,
    int? trashRetentionDays,
    int? shareRetentionDays,
  }) async =>
      null;

  @override
  Future<UserProfile?> uploadAvatar({
    required List<int> bytes,
    required String filename,
  }) async =>
      null;

  @override
  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {}
}

class _FakeNotesRepository implements NotesRepository {
  _FakeNotesRepository({
    this.pinnedFirst = false,
    this.failFetch = false,
    this.fetchError,
  });

  final bool pinnedFirst;
  final bool failFetch;
  final Object? fetchError;
  Completer<void>? _fetchGate;
  String? lastSearchQuery;
  int fetchAllCount = 0;
  final List<String?> updatedFolderIds = [];

  List<NoteItem> get _notes => [
        NoteItem(
          id: 'n1',
          title: '第一条笔记',
          content: '<p>内容</p>',
          isFavorite: false,
          isDeleted: false,
          isPinned: pinnedFirst,
          updatedAt: DateTime(2026),
        ),
        NoteItem(
          id: 'n2',
          title: '第二条笔记',
          content: '<p>内容</p>',
          isFavorite: false,
          isDeleted: false,
          isPinned: false,
          updatedAt: DateTime(2026),
        ),
      ];

  void pauseNextFetch() {
    _fetchGate = Completer<void>();
  }

  void releaseFetch() {
    final gate = _fetchGate;
    _fetchGate = null;
    gate?.complete();
  }

  Future<void> _maybeWaitForFetchGate() async {
    final gate = _fetchGate;
    if (gate != null) {
      await gate.future;
    }
  }

  @override
  Future<List<NoteItem>> fetchAll({String? folderId}) async {
    fetchAllCount += 1;
    await _maybeWaitForFetchGate();
    final error = fetchError;
    if (error != null) {
      throw error;
    }
    if (failFetch) {
      throw StateError('offline');
    }
    return _notes;
  }

  @override
  Future<List<NoteItem>> fetchFavorites() async {
    await _maybeWaitForFetchGate();
    return [
      NoteItem(
        id: 'fav-1',
        title: '收藏笔记',
        content: '<p>收藏内容</p>',
        isFavorite: true,
        isDeleted: false,
        isPinned: false,
        updatedAt: DateTime(2026),
      ),
    ];
  }

  @override
  Future<List<NoteItem>> fetchTrash() async => [
        NoteItem(
          id: 'trash-1',
          title: '废纸篓笔记',
          content: '<p>废纸篓内容</p>',
          isFavorite: false,
          isDeleted: true,
          isPinned: false,
          updatedAt: DateTime(2026),
        ),
      ];

  @override
  Future<List<NoteItem>> search(String query) async {
    lastSearchQuery = query;
    return _notes.where((note) => note.title.contains(query)).toList();
  }

  @override
  Future<NoteItem?> getById(String id) async => null;

  @override
  Future<NoteItem> create({
    required String title,
    required String content,
    String? folderId,
  }) async =>
      throw UnimplementedError();

  @override
  Future<NoteItem> update({
    required String id,
    required String title,
    required String content,
    String? folderId,
  }) async {
    updatedFolderIds.add(folderId);
    return NoteItem(
      id: id,
      title: title,
      content: content,
      folderId: folderId,
      isFavorite: id == 'fav-1',
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026),
    );
  }

  @override
  Future<void> delete(String id) async {}

  @override
  Future<NoteItem> restore(String id) async => throw UnimplementedError();

  @override
  Future<NoteItem> permanentDelete(String id) async =>
      throw UnimplementedError();

  @override
  Future<NoteItem> toggleFavorite(String id) async =>
      throw UnimplementedError();

  @override
  Future<NoteItem> togglePin(String id) async => throw UnimplementedError();

  @override
  Future<Map<String, dynamic>> stats() async => const {};

  @override
  Future<Map<String, dynamic>> share(String id) async => const {};

  @override
  Future<Map<String, dynamic>> shareInfo(String id) async => const {};

  @override
  Future<Map<String, dynamic>> revokeShare(String id) async => const {};

  @override
  Future<List<Map<String, dynamic>>> getSharedLinks() async => const [];
}

class _FakeFoldersRepository implements FoldersRepository {
  String? createdName;

  @override
  Future<List<FolderItem>> fetchFolders() async => const [
        FolderItem(id: 'f1', name: '工作'),
      ];

  @override
  Future<FolderItem> createFolder(String name) async {
    createdName = name;
    return FolderItem(id: 'f1', name: name);
  }
}
