import 'package:flutter_test/flutter_test.dart';
import 'package:mynote_android/core/network/api_client.dart';
import 'package:mynote_android/core/storage/token_storage.dart';
import 'package:mynote_android/data/repositories/auth_repository_impl.dart';
import 'package:mynote_android/data/repositories/folders_repository_impl.dart';
import 'package:mynote_android/data/repositories/notes_repository_impl.dart';
import 'package:mynote_android/domain/repositories/auth_repository.dart';
import 'package:mynote_android/domain/repositories/folders_repository.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';

void main() {
  test('data layer exposes typed repositories and infrastructure', () {
    expect(ApiClient.new, isNotNull);
    expect(TokenStorage.new, isNotNull);
    expect(AuthRepositoryImpl.new, isNotNull);
    expect(NotesRepositoryImpl.new, isNotNull);
    expect(FoldersRepositoryImpl.new, isNotNull);

    expect(AuthRepository, isNotNull);
    expect(NotesRepository, isNotNull);
    expect(FoldersRepository, isNotNull);
  });
}
