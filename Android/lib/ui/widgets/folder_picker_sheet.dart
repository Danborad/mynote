import 'package:flutter/material.dart';
import 'package:mynote_android/app/theme/app_theme.dart';
import 'package:mynote_android/domain/entities/folder_item.dart';

Future<FolderItem?> showFolderPickerSheet(
  BuildContext context, {
  required List<FolderItem> folders,
  String? currentFolderId,
}) {
  return showModalBottomSheet<FolderItem>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) {
      final palette = _paletteOf(sheetContext);
      return SafeArea(
        top: false,
        child: Container(
          margin: const EdgeInsets.fromLTRB(14, 0, 14, 12),
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
          decoration: BoxDecoration(
            color: Theme.of(sheetContext).colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.16),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Text(
                    '加入分组',
                    style: TextStyle(
                      color: palette.primaryText,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    tooltip: '关闭',
                    onPressed: () => Navigator.of(sheetContext).pop(),
                    icon: const Icon(Icons.close_rounded),
                    color: palette.secondaryText,
                    constraints:
                        const BoxConstraints.tightFor(width: 32, height: 32),
                    padding: EdgeInsets.zero,
                    style: IconButton.styleFrom(
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (folders.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  child: Text(
                    '暂无分组',
                    style: TextStyle(
                      color: palette.secondaryText,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                )
              else
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 320),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: folders.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final folder = folders[index];
                      final selected = folder.id == currentFolderId;
                      return InkWell(
                        key: ValueKey('folder-picker-${folder.id}'),
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => Navigator.of(sheetContext).pop(folder),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: selected
                                ? palette.selectedChipBackground
                                : palette.chipBackground,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: palette.cardBorder),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.folder_open_rounded,
                                size: 19,
                                color: selected
                                    ? palette.selectedChipText
                                    : palette.secondaryText,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  folder.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: selected
                                        ? palette.selectedChipText
                                        : palette.primaryText,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              if (selected)
                                Icon(
                                  Icons.check_rounded,
                                  size: 18,
                                  color: palette.selectedChipText,
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      );
    },
  );
}

MyNotePalette _paletteOf(BuildContext context) {
  final brightness = Theme.of(context).brightness;
  return Theme.of(context).extension<MyNotePalette>() ??
      (brightness == Brightness.dark ? defaultDarkPalette : defaultLightPalette);
}
