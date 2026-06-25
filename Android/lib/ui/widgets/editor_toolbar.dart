import 'package:flutter/material.dart';
import 'package:mynote_android/domain/entities/editor_format_capability.dart';

class EditorToolbar extends StatelessWidget {
  const EditorToolbar({
    super.key,
    required this.onTap,
  });

  final ValueChanged<EditorFormatCapability> onTap;

  @override
  Widget build(BuildContext context) {
    final foreground = Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFFE2E8F0)
        : const Color(0xFF475569);

    return SizedBox(
      height: 40,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _ToolbarButton(
            tooltip: '加粗',
            label: 'B',
            fontStyle: FontStyle.normal,
            fontWeight: FontWeight.w900,
            foreground: foreground,
            onPressed: () => onTap(EditorFormatCapability.bold),
          ),
          _ToolbarButton(
            tooltip: '斜体',
            label: 'I',
            fontStyle: FontStyle.italic,
            fontWeight: FontWeight.w800,
            foreground: foreground,
            onPressed: () => onTap(EditorFormatCapability.italic),
          ),
          _ToolbarButton(
            tooltip: '下划线',
            label: 'U',
            fontStyle: FontStyle.normal,
            fontWeight: FontWeight.w900,
            textDecoration: TextDecoration.underline,
            foreground: foreground,
            onPressed: () => onTap(EditorFormatCapability.underline),
          ),
          _ToolbarButton(
            tooltip: '列表',
            icon: Icons.format_list_bulleted_rounded,
            foreground: foreground,
            onPressed: () => onTap(EditorFormatCapability.bulletList),
          ),
          _ToolbarButton(
            tooltip: '任务列表',
            icon: Icons.check_box_outlined,
            foreground: foreground,
            onPressed: () => onTap(EditorFormatCapability.taskList),
          ),
          _ToolbarButton(
            tooltip: '代码块',
            icon: Icons.code_rounded,
            foreground: foreground,
            onPressed: () => onTap(EditorFormatCapability.codeBlock),
          ),
        ],
      ),
    );
  }
}

class _ToolbarButton extends StatelessWidget {
  const _ToolbarButton({
    required this.tooltip,
    required this.onPressed,
    required this.foreground,
    this.label,
    this.icon,
    this.fontStyle = FontStyle.normal,
    this.fontWeight = FontWeight.w900,
    this.textDecoration = TextDecoration.none,
  });

  final String tooltip;
  final String? label;
  final IconData? icon;
  final FontStyle fontStyle;
  final FontWeight fontWeight;
  final TextDecoration textDecoration;
  final Color foreground;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Tooltip(
        message: tooltip,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            width: 32,
            height: 38,
            decoration: BoxDecoration(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(13),
            ),
            alignment: Alignment.center,
            child: label == null
                ? Icon(icon, color: foreground, size: 20)
                : Text(
                    label!,
                    style: TextStyle(
                      fontSize: 17,
                      height: 1,
                      fontStyle: fontStyle,
                      fontWeight: fontWeight,
                      color: foreground,
                      decoration: textDecoration,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}
