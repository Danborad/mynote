import 'package:mynote_android/domain/entities/folder_item.dart';

abstract class FoldersRepository {
  Future<List<FolderItem>> fetchFolders();

  Future<FolderItem> createFolder(String name);
}
