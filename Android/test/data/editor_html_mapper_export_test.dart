import 'package:flutter_test/flutter_test.dart';
import 'package:mynote_android/data/mappers/editor_html_mapper.dart';
import 'package:mynote_android/domain/entities/editor_document.dart';

void main() {
  test('exports editor document html as stable supported markup', () {
    const mapper = EditorHtmlMapper();
    const document = EditorDocument(
      noteId: 'note-3',
      title: 'Exported',
      html: '<p>Hello <strong>World</strong></p><ul><li>One</li></ul>',
    );

    final html = mapper.exportHtml(document);

    expect(html, '<p>Hello <strong>World</strong></p><ul><li>One</li></ul>');
  });

  test('exports empty document to empty string', () {
    const mapper = EditorHtmlMapper();
    const document = EditorDocument(noteId: 'note-4', title: 'Empty', html: '');

    expect(mapper.exportHtml(document), '');
  });
}
