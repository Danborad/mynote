import 'package:flutter_test/flutter_test.dart';
import 'package:mynote_android/app/utils/note_preview.dart';
import 'package:mynote_android/domain/entities/note_item.dart';

void main() {
  test('extractPreviewData supports flexible image src attributes', () {
    expect(
      extractPreviewData('<img data-src="https://example.com/a.png">').image,
      'https://example.com/a.png',
    );
    expect(
      extractPreviewData('<img src=https://example.com/b.png>').image,
      'https://example.com/b.png',
    );
  });

  test('deriveDisplayTitle returns empty for blank untitled notes', () {
    final note = NoteItem(
      id: 'blank',
      title: '未命名笔记',
      content: '',
      isFavorite: false,
      isDeleted: false,
      isPinned: false,
      updatedAt: DateTime(2026),
    );

    expect(deriveDisplayTitle(note, extractPreviewData(note.content)), '');
  });
}
