import 'package:file_picker/file_picker.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mynote_android/app/providers.dart';
import 'package:mynote_android/app/utils/note_preview.dart';
import 'package:mynote_android/data/mappers/editor_html_mapper.dart';
import 'package:mynote_android/data/services/editor_autosave_service.dart';
import 'package:mynote_android/domain/entities/editor_document.dart';
import 'package:mynote_android/domain/entities/editor_format_capability.dart';
import 'package:mynote_android/domain/entities/note_item.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';

typedef EditorImageUrlProvider = Future<String?> Function();
typedef EditorMediaUrlProvider = Future<String?> Function(EditorMediaType type);
typedef EditorUploadMediaProvider = Future<String?> Function(
    EditorMediaType type, String path);

enum EditorMediaType {
  image,
  audio,
  video,
}

class EditorViewState {
  const EditorViewState({
    required this.document,
    this.loading = false,
    this.saving = false,
    this.error,
    this.statusText = '未保存',
    this.loaded = false,
    this.isFavorite = false,
    this.isPinned = false,
    this.folderId,
  });

  final EditorDocument document;
  final bool loading;
  final bool saving;
  final String? error;
  final String statusText;
  final bool loaded;
  final bool isFavorite;
  final bool isPinned;
  final String? folderId;

  EditorViewState copyWith({
    EditorDocument? document,
    bool? loading,
    bool? saving,
    Object? error = _sentinel,
    String? statusText,
    bool? loaded,
    bool? isFavorite,
    bool? isPinned,
    Object? folderId = _sentinel,
  }) {
    return EditorViewState(
      document: document ?? this.document,
      loading: loading ?? this.loading,
      saving: saving ?? this.saving,
      error: identical(error, _sentinel) ? this.error : error as String?,
      statusText: statusText ?? this.statusText,
      loaded: loaded ?? this.loaded,
      isFavorite: isFavorite ?? this.isFavorite,
      isPinned: isPinned ?? this.isPinned,
      folderId:
          identical(folderId, _sentinel) ? this.folderId : folderId as String?,
    );
  }
}

const _sentinel = Object();

class EditorViewModel extends StateNotifier<EditorViewState> {
  EditorViewModel({
    required this.read,
    required this.noteId,
    EditorAutosaveService? autosaveService,
    EditorImageUrlProvider? imageUrlProvider,
    EditorMediaUrlProvider? mediaUrlProvider,
    EditorUploadMediaProvider? uploadMediaProvider,
    this.debounceDuration = const Duration(milliseconds: 300),
  }) : super(
          EditorViewState(
            document: EditorDocument(
              noteId: noteId,
              title: '未命名笔记',
              html: '<p></p>',
            ),
          ),
        ) {
    _autosaveService = autosaveService ?? read(editorAutosaveServiceProvider);
    _imageUrlProvider = imageUrlProvider ?? read(editorImageUrlProvider);
    _mediaUrlProvider = mediaUrlProvider ?? read(editorMediaUrlProvider);
    _uploadMediaProvider =
        uploadMediaProvider ?? read(editorUploadMediaProvider);
  }

  final T Function<T>(ProviderListenable<T>) read;
  final String noteId;
  final Duration debounceDuration;
  late final EditorAutosaveService _autosaveService;
  late final EditorImageUrlProvider? _imageUrlProvider;
  late final EditorMediaUrlProvider? _mediaUrlProvider;
  late final EditorUploadMediaProvider? _uploadMediaProvider;

  NotesRepository get _notesRepository => read(notesRepositoryProvider);
  EditorHtmlMapper get _mapper => read(editorHtmlMapperProvider);

  Future<void> load() async {
    if (state.loaded || state.loading) return;

    state = state.copyWith(loading: true, error: null);
    try {
      final note = await _notesRepository.getById(noteId);
      if (note == null) {
        state = state.copyWith(
          loading: false,
          loaded: true,
          error: '笔记不存在',
        );
        return;
      }

      final document = _mapper.importHtml(
        note.content,
        noteId: note.id,
        title: note.title,
      );

      state = state.copyWith(
        loading: false,
        loaded: true,
        document: document,
        isFavorite: note.isFavorite,
        isPinned: note.isPinned,
        folderId: note.folderId,
        statusText: '未保存',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        loaded: true,
        error: error.toString(),
      );
    }
  }

  void updateTitle(String title) {
    state = state.copyWith(
      document: state.document.copyWith(title: title),
      statusText: '未保存',
    );
    _scheduleAutosave();
  }

  void updateHtml(String html) {
    state = state.copyWith(
      document: state.document.copyWith(html: html),
      statusText: '未保存',
    );
    _scheduleAutosave();
  }

  void updateHtmlFromEditor(String html) {
    if (html == state.document.html) return;
    state = state.copyWith(
      document: state.document.copyWith(html: html),
      statusText: '未保存',
    );
    _scheduleAutosave();
  }

  Future<String?> requestImageUrl() async {
    final mediaProvider = _mediaUrlProvider;
    if (mediaProvider != null) {
      return mediaProvider(EditorMediaType.image);
    }
    final provider = _imageUrlProvider;
    if (provider == null) return null;
    return provider();
  }

  Future<String?> requestMediaUrl(EditorMediaType type) async {
    final mediaProvider = _mediaUrlProvider;
    if (mediaProvider != null) {
      return mediaProvider(type);
    }
    if (type == EditorMediaType.image) {
      return requestImageUrl();
    }
    return null;
  }

  Future<String?> uploadMedia(EditorMediaType type, String path) async {
    final provider = _uploadMediaProvider;
    if (provider == null) return null;
    return provider(type, path);
  }

  void applyFormatCapability(EditorFormatCapability capability) {
    if (capability != EditorFormatCapability.image) {
      return;
    }

    _insertImage();
  }

  Future<void> _insertImage() async {
    final provider = _imageUrlProvider;
    if (provider == null) return;

    final url = await provider();
    if (url == null || url.trim().isEmpty) return;

    final imageHtml = '<img src="${url.trim()}" alt="image">';
    final currentHtml = state.document.html.trim();
    final nextHtml = currentHtml.isEmpty || currentHtml == '<p></p>'
        ? imageHtml
        : '$currentHtml$imageHtml';

    state = state.copyWith(
      document: state.document.copyWith(html: nextHtml),
      statusText: '未保存',
    );
    _scheduleAutosave();
  }

  void markSaved() {
    state = state.copyWith(statusText: '已保存');
  }

  Future<void> save() async {
    state = state.copyWith(saving: true, error: null, statusText: '保存中');
    try {
      final html = _mapper.exportHtml(state.document);
      final title = _deriveTitleForSave(html);
      final updated = await _notesRepository.update(
        id: state.document.noteId,
        title: title,
        content: html,
      );

      state = state.copyWith(
        saving: false,
        document: state.document.copyWith(
          noteId: updated.id,
          title: updated.title,
          html: updated.content,
        ),
        statusText: '已保存',
      );
    } catch (error) {
      state = state.copyWith(
        saving: false,
        error: error.toString(),
        statusText: '保存失败',
      );
    }
  }

  String _deriveTitleForSave(String html) {
    final preview = extractPreviewData(html);
    final text = preview.text.trim();
    if (text.isNotEmpty) {
      final firstLine = text
          .split(RegExp(r'\n+'))
          .map((line) => line.trim())
          .firstWhere((line) => line.isNotEmpty, orElse: () => '');
      if (firstLine.isNotEmpty) {
        return firstLine.length > 40 ? firstLine.substring(0, 40) : firstLine;
      }
    }
    if (preview.image != null) return '图片笔记';
    if (preview.video) return '视频笔记';
    if (preview.audio) return '音频笔记';
    return '未命名笔记';
  }

  Future<NoteItem?> toggleFavorite() async {
    final previous = state.isFavorite;
    state = state.copyWith(isFavorite: !previous, error: null);
    try {
      final updated =
          await _notesRepository.toggleFavorite(state.document.noteId);
      state = state.copyWith(
        isFavorite: updated.isFavorite,
        isPinned: updated.isPinned,
      );
      return updated;
    } catch (error) {
      state = state.copyWith(isFavorite: previous, error: error.toString());
      return null;
    }
  }

  Future<NoteItem?> togglePin() async {
    try {
      final updated = await _notesRepository.togglePin(state.document.noteId);
      state = state.copyWith(
        isFavorite: updated.isFavorite,
        isPinned: updated.isPinned,
      );
      return updated;
    } catch (error) {
      state = state.copyWith(error: error.toString());
      return null;
    }
  }

  Future<NoteItem?> moveToFolder(String folderId) async {
    try {
      final html = _mapper.exportHtml(state.document);
      final title = _deriveTitleForSave(html);
      final updated = await _notesRepository.update(
        id: state.document.noteId,
        title: title,
        content: html,
        folderId: folderId,
      );
      state = state.copyWith(
        document: state.document.copyWith(
          noteId: updated.id,
          title: updated.title,
          html: updated.content,
        ),
        isFavorite: updated.isFavorite,
        isPinned: updated.isPinned,
        folderId: updated.folderId,
        statusText: '已保存',
        error: null,
      );
      return updated;
    } catch (error) {
      state = state.copyWith(error: error.toString());
      return null;
    }
  }

  Future<bool> delete() async {
    try {
      await _notesRepository.delete(state.document.noteId);
      return true;
    } catch (error) {
      state = state.copyWith(error: error.toString());
      return false;
    }
  }

  Future<Map<String, dynamic>?> share() async {
    try {
      return await _notesRepository.share(state.document.noteId);
    } catch (error) {
      state = state.copyWith(error: error.toString());
      return null;
    }
  }

  void _scheduleAutosave() {
    _autosaveService.schedule(() async {
      await save();
    });
  }
}

final editorViewModelProvider =
    StateNotifierProvider.family<EditorViewModel, EditorViewState, String>(
  (ref, noteId) => EditorViewModel(read: ref.read, noteId: noteId),
);

final editorImageUrlProvider = Provider<EditorImageUrlProvider?>((ref) => () {
      return _pickEditorMediaUrl(EditorMediaType.image);
    });

final editorMediaUrlProvider = Provider<EditorMediaUrlProvider?>((ref) {
  return _pickEditorMediaUrl;
});

final editorUploadMediaProvider =
    Provider<EditorUploadMediaProvider?>((ref) => (type, path) async {
          final fileName = path.split(RegExp(r'[\\/]+')).last.trim();
          if (fileName.isEmpty) {
            return null;
          }

          try {
            final formData = FormData.fromMap({
              'file': await MultipartFile.fromFile(
                path,
                filename: fileName,
              ),
            });

            final response =
                await ref.read(apiClientProvider).dio.post<dynamic>(
                      '/files/upload',
                      data: formData,
                      options: Options(contentType: 'multipart/form-data'),
                    );

            final data = response.data;
            if (data is Map<String, dynamic>) {
              final url = data['url']?.toString().trim();
              if (url != null && url.isNotEmpty) {
                return url;
              }
            }
            return null;
          } catch (_) {
            return null;
          }
        });

Future<String?> _pickEditorMediaUrl(EditorMediaType type) async {
  final pickerType = switch (type) {
    EditorMediaType.image => FileType.image,
    EditorMediaType.audio => FileType.audio,
    EditorMediaType.video => FileType.video,
  };

  try {
    final result = await FilePicker.platform.pickFiles(
      type: pickerType,
      allowMultiple: false,
      withData: false,
      withReadStream: false,
    );
    final path = result?.files.single.path;
    if (path == null || path.trim().isEmpty) {
      return null;
    }
    return path;
  } catch (_) {
    return null;
  }
}
