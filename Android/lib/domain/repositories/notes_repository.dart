import 'package:mynote_android/domain/entities/note_item.dart';

abstract class NotesRepository {
  Future<List<NoteItem>> fetchAll({String? folderId});

  Future<List<NoteItem>> fetchFavorites();

  Future<List<NoteItem>> fetchTrash();

  Future<List<NoteItem>> search(String query);

  Future<NoteItem?> getById(String id);

  Future<NoteItem> create({
    required String title,
    required String content,
    String? folderId,
  });

  Future<NoteItem> update({
    required String id,
    required String title,
    required String content,
    String? folderId,
  });

  Future<void> delete(String id);

  Future<NoteItem> restore(String id);

  Future<NoteItem> permanentDelete(String id);

  Future<NoteItem> toggleFavorite(String id);

  Future<NoteItem> togglePin(String id);

  Future<Map<String, dynamic>> stats();

  Future<Map<String, dynamic>> share(String id);

  Future<Map<String, dynamic>> shareInfo(String id);

  Future<Map<String, dynamic>> revokeShare(String id);

  Future<List<Map<String, dynamic>>> getSharedLinks();
}
