import 'package:mynote_android/domain/entities/note_item.dart';

class NotePreviewData {
  const NotePreviewData({
    required this.text,
    required this.image,
    required this.audio,
    required this.video,
  });

  final String text;
  final String? image;
  final bool audio;
  final bool video;
}

class RichNoteBlock {
  const RichNoteBlock({
    required this.type,
    required this.text,
    this.url,
  });

  final String type;
  final String text;
  final String? url;
}

String stripHtml(String html) {
  return html
      .replaceAll(RegExp(r'<[^>]*>'), ' ')
      .replaceAll('&nbsp;', ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

NotePreviewData extractPreviewData(String html) {
  String? imageUrl;
  final imgTagMatch =
      RegExp(r'<img[^>]*>', caseSensitive: false).firstMatch(html);
  if (imgTagMatch != null) {
    final tag = imgTagMatch.group(0) ?? '';
    final srcDouble =
        RegExp(r'src="([^"]+)"', caseSensitive: false).firstMatch(tag);
    final srcSingle =
        RegExp(r"src='([^']+)'", caseSensitive: false).firstMatch(tag);
    final dataSrcDouble =
        RegExp(r'data-src="([^"]+)"', caseSensitive: false).firstMatch(tag);
    final dataSrcSingle =
        RegExp(r"data-src='([^']+)'", caseSensitive: false).firstMatch(tag);
    final bareSrc =
        RegExp(r'\bsrc=([^\s>]+)', caseSensitive: false).firstMatch(tag);
    imageUrl = srcDouble?.group(1) ??
        srcSingle?.group(1) ??
        dataSrcDouble?.group(1) ??
        dataSrcSingle?.group(1) ??
        bareSrc?.group(1)?.replaceAll('"', '').replaceAll("'", '');
  }
  final hasAudio =
      RegExp(r'audio-player-component|<audio\b', caseSensitive: false)
          .hasMatch(html);
  final hasVideo =
      RegExp(r'video-player-component|<video\b', caseSensitive: false)
          .hasMatch(html);

  return NotePreviewData(
    text: stripHtml(html),
    image: imageUrl,
    audio: hasAudio,
    video: hasVideo,
  );
}

String deriveDisplayTitle(NoteItem note, NotePreviewData preview) {
  final title = note.title.trim();
  if (title.isNotEmpty &&
      title != '无标题笔记' &&
      title != '未命名笔记' &&
      title != '新建笔记') {
    return title;
  }
  if (preview.image != null && preview.text.isEmpty) return '图片笔记';
  if (preview.video && preview.text.isEmpty) return '视频笔记';
  if (preview.audio && preview.text.isEmpty) return '音频笔记';

  final firstLine = preview.text.trim();
  if (firstLine.isNotEmpty) return firstLine.split('\n').first.trim();
  if (preview.image != null) return '图片笔记';
  if (preview.video) return '视频笔记';
  if (preview.audio) return '音频笔记';
  return '';
}

String buildPreviewText(NotePreviewData preview, String displayTitle) {
  final normalized = preview.text.trim();
  if (normalized.isEmpty) return '';
  if (normalized.startsWith(displayTitle)) {
    return normalized.substring(displayTitle.length).trim();
  }
  return normalized;
}

List<RichNoteBlock> extractRichBlocks(String html) {
  final imageBlocks = RegExp(
    "<img[^>]*(?:src|data-src)=[\"']([^\"']+)[\"'][^>]*>",
    caseSensitive: false,
  )
      .allMatches(html)
      .map((match) => RichNoteBlock(
            type: 'image',
            text: '',
            url: match.group(1),
          ))
      .where((block) => block.url != null && block.url!.isNotEmpty)
      .toList();

  final normalized = html
      .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
      .replaceAll(RegExp(r'</p>|</div>|</li>', caseSensitive: false), '\n')
      .replaceAll(RegExp(r'</h[1-6]>', caseSensitive: false), '\n')
      .replaceAll(RegExp(r'</pre>', caseSensitive: false), '\n')
      .replaceAll(RegExp(r'<img[^>]*>', caseSensitive: false), '\n');

  final headingMatches =
      RegExp(r'<h([1-6])[^>]*>(.*?)</h\1>', caseSensitive: false, dotAll: true)
          .allMatches(normalized)
          .map((match) => RichNoteBlock(
                type: 'heading',
                text: stripHtml(match.group(2) ?? ''),
              ))
          .where((block) => block.text.isNotEmpty)
          .toList();

  if (headingMatches.isNotEmpty) {
    return headingMatches;
  }

  final codeMatches =
      RegExp(r'<pre[^>]*>(.*?)</pre>', caseSensitive: false, dotAll: true)
          .allMatches(normalized)
          .map((match) => RichNoteBlock(
                type: 'code',
                text: stripHtml(match.group(1) ?? ''),
              ))
          .where((block) => block.text.isNotEmpty)
          .toList();

  if (codeMatches.isNotEmpty) {
    return codeMatches;
  }

  final textBlocks = normalized
      .split(RegExp(r'\n+'))
      .map((line) => line.trim())
      .where((line) => line.isNotEmpty)
      .map((line) => RichNoteBlock(type: 'paragraph', text: stripHtml(line)))
      .where((block) => block.text.isNotEmpty)
      .toList();

  return [...textBlocks, ...imageBlocks];
}
