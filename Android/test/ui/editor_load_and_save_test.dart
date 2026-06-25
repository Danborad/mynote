import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:appflowy_editor/appflowy_editor.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/data/mappers/editor_html_mapper.dart';
import 'package:mynote_android/data/services/editor_autosave_service.dart';
import 'package:mynote_android/domain/entities/note_item.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';
import 'package:mynote_android/ui/views/editor/editor_view.dart';

void main() {
  testWidgets(
      'EditorView saves content with a derived title and no title field',
      (tester) async {
    final repository = _FakeEditorNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesRepositoryProvider.overrideWithValue(repository),
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
          home: EditorView(noteId: 'note-1'),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('旧标题'), findsNothing);
    expect(find.byType(TextField), findsNothing);
    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);

    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    expect(scaffold.backgroundColor, Colors.white);
    final constrainedBoxes = tester
        .widgetList<ConstrainedBox>(find.byType(ConstrainedBox))
        .where((box) => box.constraints.maxWidth == 720);
    expect(constrainedBoxes, isEmpty);

    expect(find.textContaining('保存'), findsNothing);
    expect(find.byTooltip('插入图片'), findsNothing);
    expect(find.byIcon(Icons.add), findsNothing);
    expect(repository.lastSavedTitle, isNull);
    expect(repository.lastSavedHtml, isNull);
  });

  testWidgets('EditorView preserves structured html on save', (tester) async {
    final repository = _FakeStructuredEditorNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesRepositoryProvider.overrideWithValue(repository),
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
          home: EditorView(noteId: 'note-2'),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);
    expect(find.textContaining('保存'), findsNothing);
    expect(repository.lastSavedHtml, isNull);
  });

  testWidgets('Editor toolbar formats document and keeps unsaved status',
      (tester) async {
    final repository = _FakeEditorNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesRepositoryProvider.overrideWithValue(repository),
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
          home: EditorView(noteId: 'note-1'),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byTooltip('加粗'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));

    expect(find.textContaining('保存'), findsNothing);

    await tester.tap(find.byTooltip('列表'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));

    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);
    expect(find.textContaining('保存'), findsNothing);

    await tester.tap(find.byTooltip('代码块'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));

    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);
    expect(find.textContaining('保存'), findsNothing);
  });

  testWidgets('Editor more actions use a compact action grid', (tester) async {
    final repository = _FakeEditorNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesRepositoryProvider.overrideWithValue(repository),
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
          home: EditorView(noteId: 'note-1'),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byTooltip('更多'));
    await tester.pumpAndSettle();

    expect(find.text('更多操作'), findsOneWidget);
    expect(find.text('导出 MD'), findsOneWidget);
    expect(find.text('导出纯文本'), findsNothing);

    final copyTileSize = tester.getSize(find
        .ancestor(
          of: find.text('复制文本'),
          matching: find.byType(SizedBox),
        )
        .last);
    expect(copyTileSize.height, 72);
  });

  testWidgets('EditorView does not autofocus empty notes on open',
      (tester) async {
    final repository = _FakeEditorNotesRepository(initialContent: '');
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesRepositoryProvider.overrideWithValue(repository),
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
          home: EditorView(noteId: 'note-1'),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);
    expect(tester.testTextInput.isVisible, isFalse);
  });

  testWidgets('editor tap does not rewrite html before content changes',
      (tester) async {
    final repository = _FakeEditorNotesRepository(
      initialContent:
          '<p>百度Genclaw</p><p>http://8.210.106.110:16880/panel2026</p><p>登录信息：</p><p>用户： bossadmin</p>',
    );
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesRepositoryProvider.overrideWithValue(repository),
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
          home: EditorView(noteId: 'note-1'),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byKey(const Key('appflowy-editor-widget')));
    await tester.pump(const Duration(milliseconds: 80));

    expect(repository.lastSavedHtml, isNull);
  });

  testWidgets(
      'non-empty notes use the same editor rendering before and after tap',
      (tester) async {
    final repository = _FakeEditorNotesRepository(
      initialContent:
          '<p>ssh -L 1455:127.0.0.1:1455</p><p>root@192.168.31.63</p>',
    );
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesRepositoryProvider.overrideWithValue(repository),
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
          home: EditorView(noteId: 'note-1'),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);

    expect(find.byKey(const Key('rich-note-reader')), findsNothing);
    expect(find.byType(SelectableText), findsNothing);

    final before =
        tester.getRect(find.byKey(const Key('appflowy-editor-widget')));
    await tester.tap(find.byKey(const Key('appflowy-editor-widget')));
    await tester.pump(const Duration(milliseconds: 80));
    final after =
        tester.getRect(find.byKey(const Key('appflowy-editor-widget')));

    expect((after.top - before.top).abs(), lessThan(1));
    expect((after.height - before.height).abs(), lessThan(1));
    expect(repository.lastSavedHtml, isNull);
  });

  testWidgets('editor toolbar stays above the keyboard without a large gap',
      (tester) async {
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    final repository = _FakeEditorNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(
          size: Size(430, 932),
          viewInsets: EdgeInsets.only(bottom: 330),
        ),
        child: ProviderScope(
          overrides: [
            notesRepositoryProvider.overrideWithValue(repository),
            editorHtmlMapperProvider
                .overrideWithValue(const EditorHtmlMapper()),
            editorAutosaveServiceProvider.overrideWithValue(autosave),
          ],
          child: const MaterialApp(
            localizationsDelegates: [
              AppFlowyEditorLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            home: EditorView(noteId: 'note-1'),
          ),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    final toolbarRect = tester.getRect(find.byKey(EditorView.editorToolbarKey));
    expect(toolbarRect.top, greaterThan(500));
    expect(toolbarRect.right, lessThanOrEqualTo(430));

    final scaffoldRect = tester.getRect(find.byType(Scaffold));
    expect(toolbarRect.bottom, lessThan(scaffoldRect.bottom));

    final largeEditorSpacers = tester
        .widgetList<SizedBox>(
          find.descendant(
            of: find.byKey(const Key('appflowy-editor-widget')),
            matching: find.byType(SizedBox),
          ),
        )
        .where((box) => (box.height ?? 0) >= 100);
    expect(largeEditorSpacers, isEmpty);
  });

  testWidgets('editor toolbar fits inside narrow phone width', (tester) async {
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    final repository = _FakeEditorNotesRepository();
    final autosave = EditorAutosaveService(
      debounceDuration: const Duration(milliseconds: 10),
    );

    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(size: Size(393, 852)),
        child: ProviderScope(
          overrides: [
            notesRepositoryProvider.overrideWithValue(repository),
            editorHtmlMapperProvider
                .overrideWithValue(const EditorHtmlMapper()),
            editorAutosaveServiceProvider.overrideWithValue(autosave),
          ],
          child: const MaterialApp(
            localizationsDelegates: [
              AppFlowyEditorLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            home: EditorView(noteId: 'note-1'),
          ),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    final toolbarRect = tester.getRect(find.byKey(EditorView.editorToolbarKey));
    expect(toolbarRect.left, greaterThanOrEqualTo(0));
    expect(toolbarRect.right, lessThanOrEqualTo(393));
    expect(find.byTooltip('插入媒体'), findsNothing);
  });
}

class _FakeEditorNotesRepository implements NotesRepository {
  _FakeEditorNotesRepository({this.initialContent = '<p>旧内容</p>'});

  final String initialContent;
  String? lastSavedTitle;
  String? lastSavedHtml;

  @override
  Future<NoteItem?> getById(String id) async => NoteItem(
        id: 'note-1',
        title: '旧标题',
        content: initialContent,
        isFavorite: false,
        isDeleted: false,
        isPinned: false,
        updatedAt: DateTime(2026),
      );

  @override
  Future<NoteItem> update({
    required String id,
    required String title,
    required String content,
    String? folderId,
  }) async {
    lastSavedTitle = title;
    lastSavedHtml = content;
    return NoteItem(
      id: id,
      title: title,
      content: content,
      folderId: folderId,
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026),
    );
  }

  @override
  Future<NoteItem> create(
          {required String title,
          required String content,
          String? folderId}) async =>
      throw UnimplementedError();
  @override
  Future<void> delete(String id) async {}
  @override
  Future<List<NoteItem>> fetchAll({String? folderId}) async => const [];
  @override
  Future<List<NoteItem>> fetchFavorites() async => const [];
  @override
  Future<List<NoteItem>> fetchTrash() async => const [];
  @override
  Future<List<Map<String, dynamic>>> getSharedLinks() async => const [];
  @override
  Future<NoteItem> permanentDelete(String id) async =>
      throw UnimplementedError();
  @override
  Future<NoteItem> restore(String id) async => throw UnimplementedError();
  @override
  Future<Map<String, dynamic>> revokeShare(String id) async => const {};
  @override
  Future<List<NoteItem>> search(String query) async => const [];
  @override
  Future<Map<String, dynamic>> share(String id) async => const {};
  @override
  Future<Map<String, dynamic>> shareInfo(String id) async => const {};
  @override
  Future<Map<String, dynamic>> stats() async => const {};
  @override
  Future<NoteItem> toggleFavorite(String id) async =>
      throw UnimplementedError();
  @override
  Future<NoteItem> togglePin(String id) async => throw UnimplementedError();
}

class _FakeStructuredEditorNotesRepository implements NotesRepository {
  String? lastSavedHtml;

  @override
  Future<NoteItem?> getById(String id) async => NoteItem(
        id: 'note-2',
        title: '结构化标题',
        content:
            '<h1>结构化标题</h1><p><strong>重点</strong></p><p><img src="https://example.com/a.png" alt="pic"></p>',
        isFavorite: false,
        isDeleted: false,
        isPinned: false,
        updatedAt: DateTime(2026),
      );

  @override
  Future<NoteItem> update({
    required String id,
    required String title,
    required String content,
    String? folderId,
  }) async {
    lastSavedHtml = content;
    return NoteItem(
      id: id,
      title: title,
      content: content,
      folderId: folderId,
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026),
    );
  }

  @override
  Future<NoteItem> create(
          {required String title,
          required String content,
          String? folderId}) async =>
      throw UnimplementedError();
  @override
  Future<void> delete(String id) async {}
  @override
  Future<List<NoteItem>> fetchAll({String? folderId}) async => const [];
  @override
  Future<List<NoteItem>> fetchFavorites() async => const [];
  @override
  Future<List<NoteItem>> fetchTrash() async => const [];
  @override
  Future<List<Map<String, dynamic>>> getSharedLinks() async => const [];
  @override
  Future<NoteItem> permanentDelete(String id) async =>
      throw UnimplementedError();
  @override
  Future<NoteItem> restore(String id) async => throw UnimplementedError();
  @override
  Future<Map<String, dynamic>> revokeShare(String id) async => const {};
  @override
  Future<List<NoteItem>> search(String query) async => const [];
  @override
  Future<Map<String, dynamic>> share(String id) async => const {};
  @override
  Future<Map<String, dynamic>> shareInfo(String id) async => const {};
  @override
  Future<Map<String, dynamic>> stats() async => const {};
  @override
  Future<NoteItem> toggleFavorite(String id) async =>
      throw UnimplementedError();
  @override
  Future<NoteItem> togglePin(String id) async => throw UnimplementedError();
}
