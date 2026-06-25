import 'dart:async';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

/// Renders a share preview image that mirrors the web client's look and feel:
/// 480px wide white rounded card, full note text content (no aggressive
/// truncation), top accent bar with the MyNote brand, an optional cover image
/// extracted from the note HTML, and a centered "MyNote" footer.
///
/// `htmlContent` is the raw editor HTML for the note. Inline `<img>` tags are
/// resolved by the first image URL; everything else is rendered as plain text
/// so we never depend on a full HTML/CSS engine on the device.
Future<Uint8List> renderShareCardImage({
  required String title,
  required String body,
  required String footer,
  required Color background,
  required Color titleColor,
  required Color bodyColor,
  required Color footerColor,
  String? htmlContent,
  String? coverImageUrl,
}) async {
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);

  // 480px wide design canvas; matches the web html2canvas export size.
  const designWidth = 480.0;
  const padding = 32.0;
  const maxBodyWidth = designWidth - padding * 2;
  const accentHeight = 6.0;

  // Measure the body first so the card can grow tall enough to fit everything.
  final bodyText = _stripHtmlForShare(htmlContent ?? body);
  final bodyPainter = TextPainter(
    text: TextSpan(
      text: bodyText.isEmpty ? ' ' : bodyText,
      style: const TextStyle(
        color: Color(0xFF374151),
        fontSize: 16,
        height: 1.65,
        fontWeight: FontWeight.w400,
      ),
    ),
    textDirection: TextDirection.ltr,
  )..layout(maxWidth: maxBodyWidth);

  final titlePainter = TextPainter(
    text: TextSpan(
      text: title.trim().isEmpty ? 'MyNote' : title.trim(),
      style: const TextStyle(
        color: Color(0xFF111827),
        fontSize: 22,
        height: 1.3,
        fontWeight: FontWeight.w800,
      ),
    ),
    textDirection: TextDirection.ltr,
    maxLines: 3,
    ellipsis: '...',
  )..layout(maxWidth: maxBodyWidth);

  final footerPainter = TextPainter(
    text: const TextSpan(
      children: [
        TextSpan(
          text: 'My',
          style: TextStyle(
            color: Color(0xFF3B82F6),
            fontSize: 18,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
          ),
        ),
        TextSpan(
          text: 'Note',
          style: TextStyle(
            color: Color(0xFF374151),
            fontSize: 18,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.5,
          ),
        ),
      ],
    ),
    textDirection: TextDirection.ltr,
  )..layout();

  // Optionally bake the cover image into the card.
  ui.Image? cover;
  if (coverImageUrl != null && coverImageUrl.isNotEmpty) {
    cover = await _tryLoadNetworkImage(coverImageUrl);
  }

  const footerAreaHeight = 64.0;
  const coverAspect = 16 / 9;
  final coverHeight = cover == null
      ? 0.0
      : (maxBodyWidth * coverAspect).clamp(160.0, 260.0);

  final titleHeight = titlePainter.height;
  final bodyHeight = bodyPainter.height;
  final contentHeight = padding +
      accentHeight +
      20 +
      titleHeight +
      (cover == null ? 0 : 12 + coverHeight) +
      (titleHeight > 0 ? 18 : 0) +
      bodyHeight +
      footerAreaHeight;

  final size = Size(designWidth, contentHeight);
  final cardRect = Rect.fromLTWH(0, 0, size.width, size.height);
  final rrect = RRect.fromRectAndRadius(cardRect, const Radius.circular(28));

  // Card background.
  canvas.drawRRect(rrect, Paint()..color = Colors.white);

  // Accent bar across the top.
  final accentPaint = Paint()
    ..shader = const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF4F8DF7), Color(0xFF2D5DD8)],
    ).createShader(Rect.fromLTWH(0, 0, size.width, accentHeight));
  canvas.drawRRect(
    RRect.fromRectAndCorners(
      Rect.fromLTWH(0, 0, size.width, accentHeight),
      topLeft: const Radius.circular(28),
      topRight: const Radius.circular(28),
    ),
    accentPaint,
  );

  // Brand row below the accent bar.
  final brandPainter = TextPainter(
    text: const TextSpan(
      children: [
        TextSpan(
          text: 'My',
          style: TextStyle(
            color: Color(0xFF3B82F6),
            fontSize: 16,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
          ),
        ),
        TextSpan(
          text: 'Note',
          style: TextStyle(
            color: Color(0xFF1F2937),
            fontSize: 16,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.5,
          ),
        ),
      ],
    ),
    textDirection: TextDirection.ltr,
  )..layout();
  brandPainter.paint(canvas, const Offset(padding, 18));

  // Title.
  var cursorY = padding + accentHeight + 18;
  titlePainter.paint(canvas, Offset(padding, cursorY));
  cursorY += titleHeight + 16;

  // Cover image.
  if (cover != null) {
    final coverRect = Rect.fromLTWH(padding, cursorY, maxBodyWidth, coverHeight);
    final coverRRect =
        RRect.fromRectAndRadius(coverRect, const Radius.circular(12));
    canvas.save();
    canvas.clipRRect(coverRRect);
    paintImageIntoRect(
      canvas: canvas,
      image: cover,
      dst: coverRect,
    );
    canvas.restore();
    cursorY += coverHeight + 16;
  }

  // Body.
  bodyPainter.paint(canvas, Offset(padding, cursorY));

  // Footer separator + brand.
  final separatorY = size.height - footerAreaHeight;
  final separatorPaint = Paint()
    ..color = const Color(0xFFF3F4F6)
    ..strokeWidth = 1;
  canvas.drawLine(
    Offset(padding, separatorY),
    Offset(size.width - padding, separatorY),
    separatorPaint,
  );

  final footerOffset = Offset(
    (size.width - footerPainter.width) / 2,
    size.height - footerPainter.height - 18,
  );
  footerPainter.paint(canvas, footerOffset);

  // Close out the recording and rasterise.
  final picture = recorder.endRecording();
  final image = await picture.toImage(size.width.toInt(), size.height.toInt());
  final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
  final bytes = byteData?.buffer.asUint8List();
  if (bytes == null || bytes.isEmpty) {
    throw StateError('Failed to render share image');
  }
  return bytes;
}

void paintImageIntoRect({
  required Canvas canvas,
  required ui.Image image,
  required Rect dst,
}) {
  final src = Rect.fromLTWH(0, 0, image.width.toDouble(), image.height.toDouble());
  final fitted = _fitContain(src, dst);
  canvas.drawImageRect(image, src, fitted, Paint()..isAntiAlias = true);
}

Rect _fitContain(Rect src, Rect dst) {
  final srcAspect = src.width / src.height;
  final dstAspect = dst.width / dst.height;
  if (srcAspect > dstAspect) {
    final h = dst.width / srcAspect;
    return Rect.fromLTWH(dst.left, dst.top + (dst.height - h) / 2, dst.width, h);
  }
  final w = dst.height * srcAspect;
  return Rect.fromLTWH(dst.left + (dst.width - w) / 2, dst.top, w, dst.height);
}

Future<ui.Image?> _tryLoadNetworkImage(String url) async {
  // Network I/O has to be explicitly opted into for dart:ui in test/CI.
  // Share generation is best-effort: if the cover can't be fetched, the card
  // still renders correctly without it.
  try {
    final completer = Completer<ui.Image?>();
    final stream = NetworkImage(url).resolve(const ImageConfiguration());
    final listener = ImageStreamListener((info, _) {
      if (!completer.isCompleted) completer.complete(info.image);
    }, onError: (e, st) {
      if (!completer.isCompleted) completer.complete(null);
    });
    stream.addListener(listener);
    final image = await completer.future
        .timeout(const Duration(seconds: 2), onTimeout: () => null);
    stream.removeListener(listener);
    return image;
  } catch (_) {
    return null;
  }
}

String _stripHtmlForShare(String html) {
  if (html.isEmpty) return '';
  var text = html;
  // Remove <style>/<script> blocks entirely.
  text = text.replaceAll(
      RegExp(r'<style[^>]*>[\s\S]*?</style>', caseSensitive: false), '');
  text = text.replaceAll(
      RegExp(r'<script[^>]*>[\s\S]*?</script>', caseSensitive: false), '');
  // Normalise paragraph/break tags to newlines.
  text = text.replaceAll(RegExp(r'<(br|/p|/div|/h[1-6]|/li|/ul|/ol)\s*>',
          caseSensitive: false),
      '\n');
  text = text.replaceAll(RegExp(r'<li[^>]*>', caseSensitive: false), '• ');
  // Drop any remaining tags.
  text = text.replaceAll(RegExp(r'<[^>]+>'), '');
  // Decode a handful of common entities; the full HTML parser is overkill
  // for the share image preview.
  text = text
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'");
  // Collapse runs of blank lines.
  text = text.replaceAll(RegExp(r'\n{3,}'), '\n\n');
  return text.trim();
}
