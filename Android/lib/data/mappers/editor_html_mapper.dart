import 'dart:convert';

import 'package:mynote_android/domain/entities/editor_document.dart';

class EditorHtmlMapper {
  const EditorHtmlMapper();

  EditorDocument importHtml(
    String html, {
    required String noteId,
    required String title,
  }) {
    return EditorDocument(
      noteId: noteId,
      title: title,
      html: _normalizeImportedHtml(html),
    );
  }

  String exportHtml(EditorDocument document) {
    return document.html;
  }

  String _normalizeImportedHtml(String html) {
    var normalized = html.trim();
    if (normalized.isEmpty) return '';

    normalized = _normalizeMediaAndAnchors(normalized);
    normalized = normalized.replaceAll(
      RegExp(r'<p[^>]*>(\s|&nbsp;|<br\s*/?>)*</p>', caseSensitive: false),
      '',
    );

    final blocks = <String>[];
    final blockRegex = RegExp(
      r'<(h[1-6]|pre|ul|p|div|section|article)\b[^>]*>([\s\S]*?)</\1>|<(audio-player-component|video-player-component)([^>]*)></\3>',
      caseSensitive: false,
    );

    final matches = blockRegex.allMatches(normalized).toList();
    if (matches.isEmpty) {
      final plain = _stripUnsupportedTags(normalized).trim();
      return plain.isEmpty ? '' : '<p>$plain</p>';
    }

    for (final match in matches) {
      final rawTag = match.group(1)?.toLowerCase();
      final mediaTag = match.group(3)?.toLowerCase();
      final mediaAttributes = match.group(4) ?? '';

      if (mediaTag != null) {
        blocks.add('<$mediaTag${_sanitizeAttributes(mediaAttributes, const [
          'src',
          'filename',
          'filesize',
          'filedate',
        ])}></$mediaTag>');
        continue;
      }

      final tag = rawTag!;
      final inner = match.group(2) ?? '';
      switch (tag) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          final text = _normalizeInline(inner);
          if (text.isNotEmpty) blocks.add('<$tag>$text</$tag>');
          break;
        case 'ul':
          final items =
              RegExp(r'<li[^>]*>([\s\S]*?)</li>', caseSensitive: false)
                  .allMatches(inner)
                  .map((m) => '<li>${_normalizeListItem(m.group(1) ?? '')}</li>')
                  .join();
          blocks.add('<ul>$items</ul>');
          break;
        case 'pre':
          final code =
              RegExp(r'<code[^>]*>([\s\S]*?)</code>', caseSensitive: false)
                      .firstMatch(inner)
                      ?.group(1) ??
                  inner;
          blocks.add(
              '<pre><code>${htmlEscape.convert(_stripUnsupportedTags(code))}</code></pre>');
          break;
        default:
          final text = _normalizeInline(inner);
          if (text.isEmpty) break;
          if (_isStandaloneMedia(text)) {
            blocks.add(text);
          } else {
            blocks.add('<p>$text</p>');
          }
      }
    }

    final merged = blocks.join();
    return merged.isEmpty
        ? '<p>${_stripUnsupportedTags(normalized).trim()}</p>'
        : merged;
  }

  bool _isStandaloneMedia(String html) {
    final withoutMedia = html
        .replaceAll(
          RegExp(r'<img\b[^>]*>', caseSensitive: false),
          '',
        )
        .replaceAll(
          RegExp(
            r'<(audio-player-component|video-player-component)\b[^>]*></\1>',
            caseSensitive: false,
          ),
          '',
        )
        .trim();
    return withoutMedia.isEmpty && html.trim().isNotEmpty;
  }

  String _normalizeMediaAndAnchors(String html) {
    var normalized = html;
    normalized = normalized.replaceAllMapped(
      RegExp(r'<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>',
          caseSensitive: false),
      (m) => '<img src="${m.group(1)}" alt="${m.group(2)}">',
    );
    normalized = normalized.replaceAllMapped(
      RegExp(r'<img[^>]*src="([^"]+)"[^>]*>', caseSensitive: false),
      (m) {
        final raw = m.group(0) ?? '';
        if (RegExp(r'\balt=', caseSensitive: false).hasMatch(raw)) {
          return raw;
        }
        return '<img src="${m.group(1)}" alt="">';
      },
    );
    normalized = normalized.replaceAllMapped(
      RegExp(r'<a([^>]*)href="([^"]+)"([^>]*)>([\s\S]*?)</a>',
          caseSensitive: false),
      (m) => '<a href="${m.group(2)}"${_sanitizeAttributes(
            '${m.group(1) ?? ''} ${m.group(3) ?? ''}',
            const ['download'],
          )}>${_stripUnsupportedTags(m.group(4) ?? '').trim()}</a>',
    );
    return normalized;
  }

  String _normalizeInline(String html) {
    var text = html;
    text = _normalizeMediaAndAnchors(text);
    text = text.replaceAllMapped(
      RegExp(r'<(audio-player-component|video-player-component)([^>]*)></\1>',
          caseSensitive: false),
      (m) =>
          '<${m.group(1)}${_sanitizeAttributes(m.group(2) ?? '', const ['src', 'filename', 'filesize', 'filedate'])}></${m.group(1)}>',
    );
    text = text.replaceAllMapped(
        RegExp(r'<strong[^>]*>([\s\S]*?)</strong>', caseSensitive: false),
        (m) => '<strong>${_normalizeInline(m.group(1) ?? '')}</strong>');
    text = text.replaceAllMapped(
        RegExp(r'<em[^>]*>([\s\S]*?)</em>', caseSensitive: false),
        (m) => '<em>${_normalizeInline(m.group(1) ?? '')}</em>');
    text = text.replaceAllMapped(
        RegExp(r'<u[^>]*>([\s\S]*?)</u>', caseSensitive: false),
        (m) => '<u>${_normalizeInline(m.group(1) ?? '')}</u>');
    text = text.replaceAllMapped(
        RegExp(r'<a([^>]*)href="([^"]+)"([^>]*)>([\s\S]*?)</a>',
            caseSensitive: false),
        (m) => '<a href="${m.group(2)}"${_sanitizeAttributes(
              '${m.group(1) ?? ''} ${m.group(3) ?? ''}',
              const ['download'],
            )}>${_normalizeInline(m.group(4) ?? '')}</a>');
    return _stripUnsupportedTags(text).trim().replaceAll(RegExp(r'\s+'), ' ');
  }

  String _normalizeListItem(String html) {
    final hasChecked = RegExp(
      '<input[^>]*type=[\'" ]?checkbox[\'" ]?[^>]*checked[^>]*>'
          .replaceAll(' ', ''),
      caseSensitive: false,
    ).hasMatch(html);
    final hasCheckbox = RegExp(
      '<input[^>]*type=[\'" ]?checkbox[\'" ]?[^>]*>'
          .replaceAll(' ', ''),
      caseSensitive: false,
    ).hasMatch(html);
    final text = _normalizeInline(html.replaceAll(
      RegExp(
        '<input[^>]*type=[\'" ]?checkbox[\'" ]?[^>]*>'
            .replaceAll(' ', ''),
        caseSensitive: false,
      ),
      '',
    ));
    if (!hasCheckbox) return text;
    final checkedAttribute = hasChecked ? ' checked' : '';
    return '<input type="checkbox"$checkedAttribute /> $text'.trim();
  }

  String _sanitizeAttributes(String raw, List<String> names) {
    final buffer = StringBuffer();
    for (final name in names) {
      final match = RegExp('$name=("([^"]*)"|\'([^\']*)\')',
              caseSensitive: false)
          .firstMatch(raw);
      if (match != null) {
        final value = match.group(2) ?? match.group(3) ?? '';
        buffer.write(' $name="$value"');
      }
    }
    return buffer.toString();
  }

  String _stripUnsupportedTags(String html) {
    const placeholders = {
      'strong': '[[STRONG]]',
      '/strong': '[[/STRONG]]',
      'em': '[[EM]]',
      '/em': '[[/EM]]',
      'u': '[[U]]',
      '/u': '[[/U]]',
      'a href': '[[A_HREF]]',
      '/a': '[[/A]]',
    };

    var text = html;
    final anchorPlaceholders = <String, String>{};
    var anchorIndex = 0;
    text = text.replaceAllMapped(
      RegExp(r'<a href="([^"]+)"([^>]*)>', caseSensitive: false),
      (m) {
        final token = '[[A_OPEN_${anchorIndex++}]]';
        anchorPlaceholders[token] =
            '<a href="${m.group(1)}"${_sanitizeAttributes(m.group(2) ?? '', const ['download'])}>';
        return token;
      },
    );
    placeholders.forEach((tag, token) {
      text = text.replaceAll(RegExp('<$tag>', caseSensitive: false), token);
    });

    text = text.replaceAll(
      RegExp(
          r'<(?!/?(?:img\b|audio-player-component\b|video-player-component\b|input\b))[^>]+>'),
      '',
    );

    placeholders.forEach((tag, token) {
      text = text.replaceAll(token, '<$tag>');
    });

    anchorPlaceholders.forEach((token, value) {
      text = text.replaceAll(token, value);
    });

    return text;
  }
}
