import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mynote_android/core/network/server_url.dart';
import 'package:appflowy_editor/appflowy_editor.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/data/mappers/editor_html_mapper.dart';
import 'package:mynote_android/data/services/editor_autosave_service.dart';
import 'package:mynote_android/domain/entities/note_item.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';
import 'package:mynote_android/ui/viewmodels/editor_view_model.dart';
import 'package:mynote_android/ui/views/editor/editor_view.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('more actions can be dismissed by tapping outside',
      (tester) async {
    SharedPreferences.setMockInitialValues(
      {'server_base_url': 'https://notes.example.com'},
    );
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

    await tester.tapAt(const Offset(24, 120));
    await tester.pumpAndSettle();

    expect(find.text('更多操作'), findsNothing);
  });

  testWidgets('editor toolbar exposes media insert options and inserts media',
      (tester) async {
    SharedPreferences.setMockInitialValues(
      {'server_base_url': 'https://notes.example.com'},
    );
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
          editorMediaUrlProvider.overrideWithValue(
            (type) async => switch (type) {
              EditorMediaType.image => '/tmp/a.png',
              EditorMediaType.audio => '/tmp/a.mp3',
              EditorMediaType.video => '/tmp/a.mp4',
            },
          ),
          editorUploadMediaProvider.overrideWithValue(
            (type, path) async => switch (type) {
              EditorMediaType.image => resolveServerAssetUrl(
                  baseUrl: 'https://notes.example.com',
                  assetPath: '/uploads/attachments/a.png'),
              EditorMediaType.audio => resolveServerAssetUrl(
                  baseUrl: 'https://notes.example.com',
                  assetPath: '/uploads/attachments/a.mp3'),
              EditorMediaType.video => resolveServerAssetUrl(
                  baseUrl: 'https://notes.example.com',
                  assetPath: '/uploads/attachments/a.mp4'),
            },
          ),
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
    expect(find.byTooltip('更多'), findsOneWidget);
    expect(find.byIcon(Icons.add_rounded), findsNothing);

    await tester.tap(find.byTooltip('更多'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('插入媒体'));
    await tester.pumpAndSettle();

    expect(find.text('图片'), findsOneWidget);
    expect(find.text('音频'), findsOneWidget);
    expect(find.text('视频'), findsOneWidget);

    await tester.tap(find.text('音频'));
    await tester.pumpAndSettle();
    expect(repository.lastSavedHtml, contains('audio-player-component'));
    expect(repository.lastSavedHtml, contains('/uploads/attachments/a.mp3'));
    expect(repository.lastSavedHtml, isNot(contains('/tmp/a.mp3')));

    await tester.tap(find.byTooltip('更多'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('插入媒体'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('视频'));
    await tester.pumpAndSettle();
    expect(repository.lastSavedHtml, contains('video-player-component'));
    expect(repository.lastSavedHtml, contains('/uploads/attachments/a.mp4'));
    expect(repository.lastSavedHtml, isNot(contains('/tmp/a.mp4')));
  });
}

class _FakeEditorNotesRepository implements NotesRepository {
  int saveCount = 0;
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
    saveCount++;
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
