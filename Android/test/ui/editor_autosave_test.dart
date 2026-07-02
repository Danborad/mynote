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
import 'package:mynote_android/ui/viewmodels/editor_view_model.dart';

void main() {
  testWidgets('autosaves after debounce and marks saved', (tester) async {
    final repository = _FakeEditorNotesRepository();
    final autosave = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));
    late EditorViewModel vm;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesRepositoryProvider.overrideWithValue(repository),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: MaterialApp(
          localizationsDelegates: const [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: Consumer(
            builder: (context, ref, _) {
              vm = EditorViewModel(
                read: ref.read,
                noteId: 'note-1',
                autosaveService: autosave,
                debounceDuration: const Duration(milliseconds: 10),
              );
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );

    await vm.load();
    vm.updateTitle('标题1');
    vm.updateTitle('标题2');
    vm.updateHtml('<p>内容2</p>');

    expect(vm.state.statusText, '未保存');
    await tester.pump(const Duration(milliseconds: 30));

    expect(repository.saveCount, 1);
    expect(repository.lastSavedTitle, '内容2');
    expect(repository.lastSavedHtml, '<p>内容2</p>');
    expect(vm.state.statusText, '已保存');
  });

  testWidgets('local draft creates a remote note only after meaningful content',
      (tester) async {
    final repository = _FakeEditorNotesRepository();
    final autosave = EditorAutosaveService(
        debounceDuration: const Duration(milliseconds: 10));
    late EditorViewModel vm;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesRepositoryProvider.overrideWithValue(repository),
          editorHtmlMapperProvider.overrideWithValue(const EditorHtmlMapper()),
          editorAutosaveServiceProvider.overrideWithValue(autosave),
        ],
        child: MaterialApp(
          localizationsDelegates: const [
            AppFlowyEditorLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: Consumer(
            builder: (context, ref, _) {
              vm = EditorViewModel(
                read: ref.read,
                noteId: 'local-draft-1',
                autosaveService: autosave,
                debounceDuration: const Duration(milliseconds: 10),
              );
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );

    await vm.load();
    await vm.save();
    expect(repository.createCount, 0);
    expect(vm.state.document.noteId, 'local-draft-1');

    vm.updateHtml('<p>真正内容</p>');
    await tester.pump(const Duration(milliseconds: 30));

    expect(repository.createCount, 1);
    expect(repository.saveCount, 0);
    expect(repository.lastSavedTitle, '真正内容');
    expect(repository.lastSavedHtml, '<p>真正内容</p>');
    expect(vm.state.document.noteId, 'created-note');
    expect(vm.state.statusText, '已保存');
  });
}

class _FakeEditorNotesRepository implements NotesRepository {
  int saveCount = 0;
  int createCount = 0;
  String? lastSavedTitle;
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
  Future<NoteItem> update(
      {required String id,
      required String title,
      required String content,
      String? folderId}) async {
    saveCount++;
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
        updatedAt: DateTime(2026));
  }

  @override
  Future<NoteItem> create(
      {required String title,
      required String content,
      String? folderId}) async {
    createCount++;
    lastSavedTitle = title;
    lastSavedHtml = content;
    return NoteItem(
        id: 'created-note',
        title: title,
        content: content,
        folderId: folderId,
        isFavorite: false,
        isDeleted: false,
        isPinned: false,
        updatedAt: DateTime(2026));
  }

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
  Future<NoteItem> permanentDelete(String id) => throw UnimplementedError();
  @override
  Future<NoteItem> restore(String id) => throw UnimplementedError();
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
  Future<NoteItem> toggleFavorite(String id) => throw UnimplementedError();
  @override
  Future<NoteItem> togglePin(String id) => throw UnimplementedError();
}
