import 'package:mynote_android/domain/entities/folder_item.dart';

class FolderItemModel {
  const FolderItemModel({required this.id, required this.name});

  factory FolderItemModel.fromJson(Map<String, dynamic> json) {
    return FolderItemModel(
      id: '${json['id'] ?? ''}',
      name: '${json['name'] ?? ''}',
    );
  }

  final String id;
  final String name;

  FolderItem toEntity() => FolderItem(id: id, name: name);
}
