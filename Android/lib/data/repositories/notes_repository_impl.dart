import 'package:mynote_android/core/network/api_client.dart';
import 'package:mynote_android/data/models/note/note_item_model.dart';
import 'package:mynote_android/domain/entities/note_item.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';

class NotesRepositoryImpl implements NotesRepository {
  NotesRepositoryImpl({required this.apiClient});

  final ApiClient apiClient;

  NoteItem _mapNote(Map<dynamic, dynamic> item) {
    return NoteItemModel.fromJson(Map<String, dynamic>.from(item)).toEntity();
  }

  List<NoteItem> _mapNotes(dynamic data) {
    final rawList = switch (data) {
      List<dynamic> list => list,
      {'notes': final List<dynamic> notes} => notes,
      {'data': final List<dynamic> notes} => notes,
      {'items': final List<dynamic> notes} => notes,
      _ => const <dynamic>[],
    };
    return rawList.whereType<Map>().map(_mapNote).toList();
  }

  @override
  Future<List<NoteItem>> fetchAll({String? folderId}) async {
    final response = await apiClient.dio.get<dynamic>(
      '/notes',
      queryParameters: folderId == null ? null : {'folderId': folderId},
    );
    return _mapNotes(response.data);
  }

  @override
  Future<NoteItem> create({
    required String title,
    required String content,
    String? folderId,
  }) async {
    final response = await apiClient.dio.post<Map<String, dynamic>>(
      '/notes',
      data: {
        'title': title,
        'content': content,
        'folderId': folderId,
      },
    );
    return _mapNote(response.data ?? <String, dynamic>{});
  }

  @override
  Future<void> delete(String id) async {
    await apiClient.dio.delete<void>('/notes/$id');
  }

  @override
  Future<List<NoteItem>> fetchFavorites() async {
    final response = await apiClient.dio.get<dynamic>('/notes/favorites');
    return _mapNotes(response.data);
  }

  @override
  Future<List<NoteItem>> fetchTrash() async {
    final response = await apiClient.dio.get<dynamic>('/notes/trash');
    return _mapNotes(response.data);
  }

  @override
  Future<NoteItem?> getById(String id) async {
    final response =
        await apiClient.dio.get<Map<String, dynamic>>('/notes/$id');
    final data = response.data;
    if (data == null) return null;
    return _mapNote(data);
  }

  @override
  Future<List<Map<String, dynamic>>> getSharedLinks() async {
    final response =
        await apiClient.dio.get<List<dynamic>>('/notes/shared-links');
    return (response.data ?? const [])
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  @override
  Future<NoteItem> permanentDelete(String id) async {
    final existing = await getById(id);
    await apiClient.dio.delete<void>('/notes/$id/permanent');
    if (existing != null) {
      return existing;
    }
    return NoteItem(
      id: id,
      title: '',
      content: '',
      isFavorite: false,
      isDeleted: true,
      isPinned: false,
      updatedAt: null,
    );
  }

  @override
  Future<NoteItem> restore(String id) async {
    final response =
        await apiClient.dio.post<Map<String, dynamic>>('/notes/$id/restore');
    return _mapNote(response.data ?? <String, dynamic>{});
  }

  @override
  Future<List<NoteItem>> search(String query) async {
    final response = await apiClient.dio.get<dynamic>(
      '/notes/search',
      queryParameters: {'q': query},
    );
    return _mapNotes(response.data);
  }

  @override
  Future<Map<String, dynamic>> share(String id) async {
    final response =
        await apiClient.dio.post<Map<String, dynamic>>('/notes/$id/share');
    return Map<String, dynamic>.from(
        response.data ?? const <String, dynamic>{});
  }

  @override
  Future<Map<String, dynamic>> shareInfo(String id) async {
    final response =
        await apiClient.dio.get<Map<String, dynamic>>('/notes/$id/share');
    return Map<String, dynamic>.from(
        response.data ?? const <String, dynamic>{});
  }

  @override
  Future<Map<String, dynamic>> stats() async {
    final response =
        await apiClient.dio.get<Map<String, dynamic>>('/notes/stats');
    return Map<String, dynamic>.from(
        response.data ?? const <String, dynamic>{});
  }

  @override
  Future<NoteItem> toggleFavorite(String id) async {
    final response =
        await apiClient.dio.post<Map<String, dynamic>>('/notes/$id/favorite');
    return _mapNote(response.data ?? <String, dynamic>{});
  }

  @override
  Future<NoteItem> togglePin(String id) async {
    final response =
        await apiClient.dio.post<Map<String, dynamic>>('/notes/$id/pin');
    return _mapNote(response.data ?? <String, dynamic>{});
  }

  @override
  Future<NoteItem> update({
    required String id,
    required String title,
    required String content,
    String? folderId,
  }) async {
    final response = await apiClient.dio.put<Map<String, dynamic>>(
      '/notes/$id',
      data: {
        'title': title,
        'content': content,
        'folderId': folderId,
      },
    );
    return _mapNote(response.data ?? <String, dynamic>{});
  }

  @override
  Future<Map<String, dynamic>> revokeShare(String id) async {
    final response =
        await apiClient.dio.delete<Map<String, dynamic>>('/notes/$id/share');
    return Map<String, dynamic>.from(
        response.data ?? const <String, dynamic>{});
  }
}
