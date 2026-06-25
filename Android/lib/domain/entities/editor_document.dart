class EditorDocument {
  const EditorDocument({
    required this.noteId,
    required this.title,
    required this.html,
  });

  final String noteId;
  final String title;
  final String html;

  EditorDocument copyWith({
    String? noteId,
    String? title,
    String? html,
  }) {
    return EditorDocument(
      noteId: noteId ?? this.noteId,
      title: title ?? this.title,
      html: html ?? this.html,
    );
  }
}
