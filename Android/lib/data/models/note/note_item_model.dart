import 'package:mynote_android/domain/entities/note_item.dart';

class NoteItemModel {
  const NoteItemModel({
    required this.id,
    required this.title,
    required this.content,
    this.folderId,
    required this.isFavorite,
    required this.isDeleted,
    required this.isPinned,
    this.createdAt,
    required this.updatedAt,
    this.color,
    this.shareToken,
    this.sharedAt,
  });

  factory NoteItemModel.fromJson(Map<String, dynamic> json) {
    return NoteItemModel(
      id: '${json['id'] ?? ''}',
      title: '${json['title'] ?? ''}',
      content: '${json['content'] ?? ''}',
      folderId: json['folderId']?.toString(),
      isFavorite: json['isFavorite'] == true,
      isDeleted: json['isDeleted'] == true,
      isPinned: json['isPinned'] == true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse('${json['createdAt']}')
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse('${json['updatedAt']}')
          : null,
      color: json['color']?.toString(),
      shareToken: json['shareToken']?.toString(),
      sharedAt: json['sharedAt'] != null
          ? DateTime.tryParse('${json['sharedAt']}')
          : null,
    );
  }

  final String id;
  final String title;
  final String content;
  final String? folderId;
  final bool isFavorite;
  final bool isDeleted;
  final bool isPinned;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? color;
  final String? shareToken;
  final DateTime? sharedAt;

  NoteItem toEntity() => NoteItem(
        id: id,
        title: title,
        content: content,
        folderId: folderId,
        isFavorite: isFavorite,
        isDeleted: isDeleted,
        isPinned: isPinned,
        createdAt: createdAt,
        updatedAt: updatedAt,
        color: color,
        shareToken: shareToken,
        sharedAt: sharedAt,
      );
}
