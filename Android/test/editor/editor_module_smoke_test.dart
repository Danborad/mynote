import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:appflowy_editor/appflowy_editor.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/data/mappers/editor_html_mapper.dart';
import 'package:mynote_android/domain/entities/note_item.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';
import 'package:mynote_android/ui/views/editor/editor_view.dart';

Widget _buildTestApp(
  NotesRepository repository, {
  String noteId = 'note-1',
  bool autoLoad = true,
  VoidCallback? onBack,
}) {
  return ProviderScope(
    overrides: [
      notesRepositoryProvider.overrideWithValue(repository),
      editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
    ],
    child: MaterialApp(
      localizationsDelegates: const [
        AppFlowyEditorLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: EditorView(
        noteId: noteId,
        autoLoad: autoLoad,
        onBack: onBack,
      ),
    ),
  );
}

int shareNoteImageCalls = 0;

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    shareNoteImageCalls = 0;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'Clipboard.setData' ||
          call.method == 'Clipboard.getData') {
        return null;
      }
      return null;
    });
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('mynote/share'),
      (call) async {
        if (call.method == 'shareNoteImage') {
          shareNoteImageCalls += 1;
          return null;
        }
        return null;
      },
    );
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, null);
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('mynote/share'), null);
  });

  testWidgets('EditorView renders rich editor shell', (tester) async {
    await tester.pumpWidget(
      _buildTestApp(_FakeSmokeNotesRepository(), autoLoad: false),
    );

    await tester.pump();

    expect(find.byKey(EditorView.editorDocumentKey), findsOneWidget);
    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);
    expect(find.byTooltip('收藏'), findsOneWidget);
    expect(find.byTooltip('删除'), findsOneWidget);
    expect(find.byTooltip('更多'), findsOneWidget);
    expect(find.text('未保存'), findsNothing);
    expect(find.text('保存'), findsNothing);
  });

  testWidgets('EditorView shows favorite success feedback', (tester) async {
    final repository = _FakeSmokeNotesRepository();

    await tester.pumpWidget(_buildTestApp(repository));

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byIcon(Icons.favorite_border_rounded), findsOneWidget);
    expect(find.byIcon(Icons.favorite_rounded), findsNothing);

    await tester.tap(find.byTooltip('收藏'));
    await tester.pumpAndSettle();

    expect(repository.favoriteToggleCount, 1);
    expect(find.byIcon(Icons.favorite_rounded), findsOneWidget);
    expect(find.text('已收藏'), findsOneWidget);
  });

  testWidgets('EditorView rolls back favorite state on failure',
      (tester) async {
    final repository = _FakeSmokeNotesRepository(favoriteShouldFail: true);

    await tester.pumpWidget(_buildTestApp(repository));

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byTooltip('收藏'));
    await tester.pumpAndSettle();

    expect(repository.favoriteToggleCount, 1);
    expect(find.text('收藏失败'), findsOneWidget);
    expect(find.byIcon(Icons.favorite_border_rounded), findsOneWidget);
  });

  testWidgets('EditorView asks for delete confirmation', (tester) async {
    final repository = _FakeSmokeNotesRepository();

    await tester.pumpWidget(_buildTestApp(repository));

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byTooltip('删除'));
    await tester.pumpAndSettle();

    expect(find.text('确认删除这篇笔记？'), findsOneWidget);
    expect(repository.deletedIds, isEmpty);
  });

  testWidgets('EditorView deletes note after confirmation', (tester) async {
    final repository = _FakeSmokeNotesRepository();
    var leftEditor = false;

    await tester
        .pumpWidget(_buildTestApp(repository, onBack: () => leftEditor = true));

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byTooltip('删除'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('删除'));
    await tester.pumpAndSettle();

    expect(repository.deletedIds, ['note-1']);
    expect(leftEditor, isTrue);
  });

  testWidgets('EditorView shows delete failure feedback', (tester) async {
    final repository = _FakeSmokeNotesRepository(deleteShouldFail: true);
    var leftEditor = false;

    await tester
        .pumpWidget(_buildTestApp(repository, onBack: () => leftEditor = true));

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byTooltip('删除'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('删除'));
    await tester.pumpAndSettle();

    expect(find.text('删除失败'), findsOneWidget);
    expect(leftEditor, isFalse);
  });

  testWidgets('EditorView shows more actions bottom sheet', (tester) async {
    await tester.pumpWidget(_buildTestApp(_FakeSmokeNotesRepository()));

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byTooltip('更多'));
    await tester.pumpAndSettle();

    expect(find.text('更多操作'), findsOneWidget);
    expect(find.text('复制文本'), findsOneWidget);
    expect(find.text('图片分享'), findsOneWidget);
    expect(find.text('链接分享'), findsOneWidget);
    expect(find.text('导出 MD'), findsOneWidget);
    expect(find.text('导出文本'), findsOneWidget);
    expect(find.text('置顶'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(BottomSheet),
        matching: find.text('保存'),
      ),
      findsNothing,
    );
  });

  testWidgets('EditorView copies note text from more actions', (tester) async {
    final repository = _FakeSmokeNotesRepository();

    await tester.pumpWidget(_buildTestApp(repository));

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byTooltip('更多'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('复制文本'));
    await tester.pumpAndSettle();

    expect(find.text('已复制文本'), findsOneWidget);
  });

  testWidgets('EditorView shares link from more actions', (tester) async {
    final repository = _FakeSmokeNotesRepository();

    await tester.pumpWidget(_buildTestApp(repository));

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byTooltip('更多'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('链接分享'));
    await tester.pumpAndSettle();

    expect(repository.shareCount, 1);
    expect(find.text('分享链接已复制'), findsOneWidget);
  });

  testWidgets('EditorView toggles pin from more actions sheet', (tester) async {
    final repository = _FakeSmokeNotesRepository();

    await tester.pumpWidget(_buildTestApp(repository));

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byTooltip('更多'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('置顶'));
    await tester.pumpAndSettle();

    expect(repository.pinToggleCount, 1);
    expect(find.text('已置顶'), findsOneWidget);
  });

  testWidgets('EditorView exports markdown from more actions', (tester) async {
    final repository = _FakeSmokeNotesRepository();

    await tester.pumpWidget(_buildTestApp(repository));

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byTooltip('更多'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('more-action-导出 MD')));
    await tester.pumpAndSettle();

    expect(find.text('导出 Markdown 暂未接入'), findsOneWidget);
  });

  testWidgets('EditorView exports plain text from more actions',
      (tester) async {
    final repository = _FakeSmokeNotesRepository();

    await tester.pumpWidget(_buildTestApp(repository));

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byTooltip('更多'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('more-action-导出文本')));
    await tester.pumpAndSettle();

    expect(find.text('导出纯文本 暂未接入'), findsOneWidget);
  });

  testWidgets('EditorView handles share as image from more actions',
      (tester) async {
    tester.view.physicalSize = const Size(1080, 1920);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeSmokeNotesRepository();

    await tester.pumpWidget(_buildTestApp(repository));

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.byTooltip('更多'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('more-action-图片分享')));
    await tester.runAsync(() async {
      await Future<void>.delayed(const Duration(milliseconds: 500));
    });
    await tester.pumpAndSettle();

    expect(find.text('图片预览'), findsOneWidget);
    expect(shareNoteImageCalls, 0);

    await tester.tap(find.text('发送'));
    await tester.pumpAndSettle();

    expect(find.text('图片分享已打开'), findsNothing);
    expect(find.text('图片分享失败'), findsNothing);
    expect(shareNoteImageCalls, 1);
  });

  testWidgets(
      'EditorView falls back to html view when document bootstrap fails',
      (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesRepositoryProvider
              .overrideWithValue(_FakeBrokenHtmlNotesRepository()),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorDocumentParserProvider.overrideWithValue(
            (html) => throw StateError('broken parser'),
          ),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: EditorView(noteId: 'note-broken'),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('富文本解析失败，当前降级为 HTML 视图。'), findsOneWidget);
    expect(find.textContaining('<audio-player-component'), findsOneWidget);
    expect(find.byKey(const Key('appflowy-editor-widget')), findsNothing);
    expect(find.byTooltip('更多'), findsOneWidget);
  });
}

class _FakeSmokeNotesRepository implements NotesRepository {
  _FakeSmokeNotesRepository({
    this.favoriteShouldFail = false,
    this.deleteShouldFail = false,
    this.initialFavorite = false,
    this.initialPinned = false,
    Map<String, dynamic>? shareResponse,
  })  : shareResponse = shareResponse ??
            const {
              'enabled': true,
              'shareUrl': 'http://test/share/1',
            },
        _isFavorite = initialFavorite,
        _isPinned = initialPinned;

  final bool favoriteShouldFail;
  final bool deleteShouldFail;
  final bool saveShouldFail = false;
  final bool pinShouldFail = false;
  final bool shareShouldFail = false;
  final bool initialFavorite;
  final bool initialPinned;
  final Map<String, dynamic> shareResponse;

  int favoriteToggleCount = 0;
  int pinToggleCount = 0;
  int saveCount = 0;
  int shareCount = 0;
  final List<String> deletedIds = [];
  bool _isFavorite;
  bool _isPinned;

  NoteItem _buildNote(
    String id, {
    String title = '烟雾测试笔记',
    String content = '<p>烟雾测试内容</p>',
    String? folderId,
  }) {
    return NoteItem(
      id: id,
      title: title,
      content: content,
      folderId: folderId,
      isFavorite: _isFavorite,
      isDeleted: false,
      isPinned: _isPinned,
      updatedAt: DateTime(2026),
    );
  }

  @override
  Future<NoteItem?> getById(String id) async => _buildNote(id);

  @override
  Future<NoteItem> update({
    required String id,
    required String title,
    required String content,
    String? folderId,
  }) async {
    saveCount += 1;
    if (saveShouldFail) {
      throw StateError('save failed');
    }
    return _buildNote(id, title: title, content: content, folderId: folderId);
  }

  @override
  Future<NoteItem> create({
    required String title,
    required String content,
    String? folderId,
  }) async =>
      throw UnimplementedError();

  @override
  Future<void> delete(String id) async {
    if (deleteShouldFail) {
      throw StateError('delete failed');
    }
    deletedIds.add(id);
  }

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
  Future<List<NoteItem>> search(String query) async => const [];

  @override
  Future<Map<String, dynamic>> revokeShare(String id) async => const {};

  @override
  Future<Map<String, dynamic>> share(String id) async {
    shareCount += 1;
    if (shareShouldFail) {
      throw StateError('share failed');
    }
    return Map<String, dynamic>.from(shareResponse);
  }

  @override
  Future<Map<String, dynamic>> shareInfo(String id) async => const {};

  @override
  Future<Map<String, dynamic>> stats() async => const {};

  @override
  Future<NoteItem> toggleFavorite(String id) async {
    favoriteToggleCount += 1;
    if (favoriteShouldFail) {
      throw StateError('favorite failed');
    }
    _isFavorite = !_isFavorite;
    return _buildNote(id);
  }

  @override
  Future<NoteItem> togglePin(String id) async {
    pinToggleCount += 1;
    if (pinShouldFail) {
      throw StateError('pin failed');
    }
    _isPinned = !_isPinned;
    return _buildNote(id);
  }
}

class _FakeBrokenHtmlNotesRepository implements NotesRepository {
  @override
  Future<NoteItem?> getById(String id) async => NoteItem(
        id: id,
        title: '异常 HTML',
        content:
            '<audio-player-component src="https://example.com/a.mp3" filename="a.mp3"></audio-player-component>',
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
  Future<NoteItem> create({
    required String title,
    required String content,
    String? folderId,
  }) async =>
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
  Future<List<NoteItem>> search(String query) async => const [];

  @override
  Future<Map<String, dynamic>> revokeShare(String id) async => const {};

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
