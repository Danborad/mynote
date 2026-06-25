import 'package:flutter_test/flutter_test.dart';
import 'package:mynote_android/data/mappers/editor_html_mapper.dart';
import 'package:mynote_android/domain/entities/editor_document.dart';

void main() {
  test('imports supported html blocks and inline formatting', () {
    const mapper = EditorHtmlMapper();

    final document = mapper.importHtml(
      '<h1>Main Title</h1>'
      '<p>Hello <strong>World</strong> <em>and</em> <u>more</u></p>'
      '<ul><li>Item 1</li><li>Item <strong>2</strong></li></ul>'
      '<ul><li><input type="checkbox" checked /> Done task</li></ul>'
      '<pre><code>line 1\nline 2</code></pre>'
      '<p><img src="https://example.com/a.png" alt="pic"></p>'
      '<p><a href="https://example.com/file.pdf" download="file.pdf">File</a></p>'
      '<audio-player-component src="https://example.com/a.mp3" filename="a.mp3" filesize="1MB" filedate="2026-05-09"></audio-player-component>'
      '<video-player-component src="https://example.com/a.mp4" filename="a.mp4" filesize="4MB" filedate="2026-05-09"></video-player-component>',
      noteId: 'note-1',
      title: 'Imported',
    );

    expect(document, isA<EditorDocument>());
    expect(document.noteId, 'note-1');
    expect(document.title, 'Imported');
    expect(document.html, contains('<h1>Main Title</h1>'));
    expect(
      document.html,
      contains('<p>Hello <strong>World</strong> <em>and</em> <u>more</u></p>'),
    );
    expect(document.html,
        contains('<ul><li>Item 1</li><li>Item <strong>2</strong></li></ul>'));
    expect(document.html,
        contains('<ul><li><input type="checkbox" checked /> Done task</li></ul>'));
    expect(document.html, contains('<pre><code>line 1\nline 2</code></pre>'));
    expect(document.html,
        contains('<img src="https://example.com/a.png" alt="pic">'));
    expect(
      document.html,
      contains(
          '<a href="https://example.com/file.pdf" download="file.pdf">File</a>'),
    );
    expect(
      document.html,
      contains(
          '<audio-player-component src="https://example.com/a.mp3" filename="a.mp3" filesize="1MB" filedate="2026-05-09"></audio-player-component>'),
    );
    expect(
      document.html,
      contains(
          '<video-player-component src="https://example.com/a.mp4" filename="a.mp4" filesize="4MB" filedate="2026-05-09"></video-player-component>'),
    );
  });

  test('unknown tags downgrade to plain text paragraphs', () {
    const mapper = EditorHtmlMapper();

    final document = mapper.importHtml(
      '<div><span>Alpha</span><custom>Beta</custom></div>',
      noteId: 'note-2',
      title: 'Fallback',
    );

    expect(document.html, '<p>AlphaBeta</p>');
  });

  test('media tags wrapped by paragraph containers are preserved', () {
    const mapper = EditorHtmlMapper();

    final document = mapper.importHtml(
      '<div><audio-player-component src="https://example.com/a.mp3" filename="a.mp3"></audio-player-component></div>'
      '<p><video-player-component src="https://example.com/a.mp4" filename="a.mp4"></video-player-component></p>',
      noteId: 'note-3',
      title: 'Media wrappers',
    );

    expect(
      document.html,
      contains(
          '<audio-player-component src="https://example.com/a.mp3" filename="a.mp3"></audio-player-component>'),
    );
    expect(
      document.html,
      contains(
          '<video-player-component src="https://example.com/a.mp4" filename="a.mp4"></video-player-component>'),
    );
  });
}
