import 'package:mynote_android/core/network/api_client.dart';
import 'package:mynote_android/data/models/folder/folder_item_model.dart';
import 'package:mynote_android/domain/entities/folder_item.dart';
import 'package:mynote_android/domain/repositories/folders_repository.dart';

class FoldersRepositoryImpl implements FoldersRepository {
  FoldersRepositoryImpl({required this.apiClient});

  final ApiClient apiClient;

  @override
  Future<FolderItem> createFolder(String name) async {
    final response = await apiClient.dio.post<Map<String, dynamic>>(
      '/folders',
      data: {'name': name},
    );
    return FolderItemModel.fromJson(response.data ?? <String, dynamic>{})
        .toEntity();
  }

  @override
  Future<List<FolderItem>> fetchFolders() async {
    final response = await apiClient.dio.get<List<dynamic>>('/folders');
    return (response.data ?? const [])
        .whereType<Map>()
        .map((item) => FolderItemModel.fromJson(Map<String, dynamic>.from(item))
            .toEntity())
        .toList();
  }
}
