import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:mynote_android/domain/entities/note_item.dart';

class LocalNotesStorage {
  static const _notesKey = 'local_notes_cache_v1';
  static const _pendingKey = 'local_notes_pending_v1';
  static const _offlineModeKey = 'local_notes_offline_mode_v1';

  Future<bool> readOfflineMode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_offlineModeKey) ?? false;
  }

  Future<void> saveOfflineMode(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_offlineModeKey, value);
  }

  Future<List<NoteItem>> readNotes() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_notesKey);
    if (raw == null || raw.isEmpty) return const [];
    final decoded = jsonDecode(raw);
    if (decoded is! List) return const [];
    return decoded
        .whereType<Map>()
        .map((item) => _noteFromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<NoteItem?> readNote(String id) async {
    final notes = await readNotes();
    for (final note in notes) {
      if (note.id == id) return note;
    }
    return null;
  }

  Future<void> saveNotes(List<NoteItem> notes) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _notesKey,
      jsonEncode(notes.map(_noteToJson).toList()),
    );
  }

  Future<void> upsertNote(NoteItem note) async {
    final notes = await readNotes();
    final index = notes.indexWhere((item) => item.id == note.id);
    final next = [...notes];
    if (index == -1) {
      next.insert(0, note);
    } else {
      next[index] = note;
    }
    await saveNotes(next);
  }

  Future<void> removeNote(String id) async {
    final notes = await readNotes();
    await saveNotes(notes.where((note) => note.id != id).toList());
  }

  Future<List<PendingNoteOperation>> readPendingOperations() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_pendingKey);
    if (raw == null || raw.isEmpty) return const [];
    final decoded = jsonDecode(raw);
    if (decoded is! List) return const [];
    return decoded
        .whereType<Map>()
        .map((item) =>
            PendingNoteOperation.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<void> savePendingOperations(
    List<PendingNoteOperation> operations,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _pendingKey,
      jsonEncode(operations.map((operation) => operation.toJson()).toList()),
    );
  }

  Future<void> addPendingOperation(PendingNoteOperation operation) async {
    final operations = await readPendingOperations();
    await savePendingOperations([...operations, operation]);
  }

  Future<int> pendingCount() async {
    return (await readPendingOperations()).length;
  }

  Map<String, dynamic> _noteToJson(NoteItem note) {
    return {
      'id': note.id,
      'title': note.title,
      'content': note.content,
      'folderId': note.folderId,
      'isFavorite': note.isFavorite,
      'isDeleted': note.isDeleted,
      'isPinned': note.isPinned,
      'createdAt': note.createdAt?.toIso8601String(),
      'updatedAt': note.updatedAt?.toIso8601String(),
      'color': note.color,
      'shareToken': note.shareToken,
      'sharedAt': note.sharedAt?.toIso8601String(),
    };
  }

  NoteItem _noteFromJson(Map<String, dynamic> json) {
    DateTime? parseDate(Object? value) {
      final raw = value?.toString();
      if (raw == null || raw.isEmpty) return null;
      return DateTime.tryParse(raw);
    }

    return NoteItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      folderId: json['folderId']?.toString(),
      isFavorite: json['isFavorite'] == true,
      isDeleted: json['isDeleted'] == true,
      isPinned: json['isPinned'] == true,
      createdAt: parseDate(json['createdAt']),
      updatedAt: parseDate(json['updatedAt']),
      color: json['color']?.toString(),
      shareToken: json['shareToken']?.toString(),
      sharedAt: parseDate(json['sharedAt']),
    );
  }
}

class PendingNoteOperation {
  const PendingNoteOperation({
    required this.type,
    required this.note,
  });

  final String type;
  final NoteItem note;

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'note': {
        'id': note.id,
        'title': note.title,
        'content': note.content,
        'folderId': note.folderId,
        'isFavorite': note.isFavorite,
        'isDeleted': note.isDeleted,
        'isPinned': note.isPinned,
        'createdAt': note.createdAt?.toIso8601String(),
        'updatedAt': note.updatedAt?.toIso8601String(),
        'color': note.color,
        'shareToken': note.shareToken,
        'sharedAt': note.sharedAt?.toIso8601String(),
      },
    };
  }

  factory PendingNoteOperation.fromJson(Map<String, dynamic> json) {
    final storage = LocalNotesStorage();
    return PendingNoteOperation(
      type: json['type']?.toString() ?? 'update',
      note: storage._noteFromJson(
        Map<String, dynamic>.from(json['note'] as Map? ?? const {}),
      ),
    );
  }
}
