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
  testWidgets('toolbar actions update html and keep unsaved', (tester) async {
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
    expect(find.byKey(const Key('appflowy-editor-widget')), findsOneWidget);
    expect(find.textContaining('保存'), findsNothing);
    expect(find.textContaining('已触发'), findsNothing);
    expect(find.byTooltip('图片'), findsNothing);

    await tester.tap(find.byTooltip('任务列表'));
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

  testWidgets('list and todo toolbar actions preserve structured html',
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

    await tester.tap(find.byTooltip('列表'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));

    await tester.pump(const Duration(milliseconds: 30));

    expect(repository.lastSavedHtml, contains('<ul>'));
    expect(repository.lastSavedHtml, contains('<li>'));

    await tester.tap(find.byTooltip('任务列表'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));

    await tester.pump(const Duration(milliseconds: 30));

    expect(repository.lastSavedHtml, contains('type="checkbox"'));

    await tester.tap(find.byTooltip('代码块'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));

    await tester.pump(const Duration(milliseconds: 30));

    expect(repository.lastSavedHtml, contains('<pre><code>'));
  });
}

class _FakeEditorNotesRepository implements NotesRepository {
  String? lastSavedHtml;

  @override
  Future<NoteItem?> getById(String id) async => NoteItem(
        id: 'note-1',
        title: '旧标题',
        content: '<p>旧内容</p>',
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
