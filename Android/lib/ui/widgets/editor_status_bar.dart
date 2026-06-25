import 'package:flutter/material.dart';

class EditorStatusBar extends StatelessWidget {
  const EditorStatusBar({
    super.key,
    required this.statusText,
  });

  final String statusText;

  @override
  Widget build(BuildContext context) {
    final isSaved = statusText == '已保存';
    final isSaving = statusText.contains('保存中');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: isSaved ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isSaved ? const Color(0xFFA7F3D0) : const Color(0xFFFDE68A),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isSaved
                ? Icons.cloud_done_outlined
                : isSaving
                    ? Icons.sync_rounded
                    : Icons.cloud_queue_outlined,
            size: 15,
            color: isSaved ? const Color(0xFF059669) : const Color(0xFFD97706),
          ),
          const SizedBox(width: 6),
          Text(
            statusText,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isSaved ? const Color(0xFF047857) : const Color(0xFF92400E),
            ),
          ),
        ],
      ),
    );
  }
}
