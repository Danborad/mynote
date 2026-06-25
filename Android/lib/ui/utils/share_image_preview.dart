import 'dart:typed_data';

import 'package:flutter/material.dart';

Future<bool> showShareImagePreview(
  BuildContext context, {
  required Uint8List bytes,
}) async {
  final result = await showDialog<bool>(
    context: context,
    barrierColor: Colors.black.withOpacity(0.48),
    builder: (dialogContext) {
      final theme = Theme.of(dialogContext);
      final scheme = theme.colorScheme;
      final size = MediaQuery.sizeOf(dialogContext);
      final previewWidth = (size.width * 0.84).clamp(320.0, 430.0);
      final previewHeight = (size.height * 0.72).clamp(460.0, 660.0);

      return Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 28),
        backgroundColor: Colors.transparent,
        child: SizedBox(
          width: previewWidth,
          height: previewHeight,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: scheme.surface,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.24),
                  blurRadius: 26,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 8, 8, 6),
                  child: Row(
                    children: [
                      Text(
                        '图片预览',
                        style: TextStyle(
                          color: scheme.onSurface,
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        tooltip: '关闭',
                        onPressed: () => Navigator.of(dialogContext).pop(false),
                        icon: const Icon(Icons.close_rounded, size: 20),
                        constraints:
                            const BoxConstraints.tightFor(width: 36, height: 36),
                        padding: EdgeInsets.zero,
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: theme.brightness == Brightness.dark
                          ? const Color(0xFF0B1220)
                          : const Color(0xFFF3F6FB),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: InteractiveViewer(
                      minScale: 0.8,
                      maxScale: 4,
                      child: Center(
                        child: Image.memory(
                          bytes,
                          fit: BoxFit.contain,
                          filterQuality: FilterQuality.high,
                        ),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => Navigator.of(dialogContext).pop(false),
                          icon: const Icon(Icons.close_rounded, size: 17),
                          label: const Text('取消'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () => Navigator.of(dialogContext).pop(true),
                          icon: const Icon(Icons.ios_share_rounded, size: 17),
                          label: const Text('发送'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    },
  );
  return result == true;
}
