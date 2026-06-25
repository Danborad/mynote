class NoteItem {
  const NoteItem({
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
}
