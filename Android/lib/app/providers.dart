import 'package:appflowy_editor/appflowy_editor.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mynote_android/core/network/api_client.dart';
import 'package:mynote_android/core/storage/note_font_size_storage.dart';
import 'package:mynote_android/core/storage/local_notes_storage.dart';
import 'package:mynote_android/core/storage/server_settings_storage.dart';
import 'package:mynote_android/core/storage/theme_mode_storage.dart';
import 'package:mynote_android/core/storage/token_storage.dart';
import 'package:mynote_android/data/mappers/editor_html_mapper.dart';
import 'package:mynote_android/data/services/editor_autosave_service.dart';
import 'package:mynote_android/data/repositories/auth_repository_impl.dart';
import 'package:mynote_android/data/repositories/folders_repository_impl.dart';
import 'package:mynote_android/data/repositories/notes_repository_impl.dart';
import 'package:mynote_android/data/repositories/offline_notes_repository.dart';
import 'package:mynote_android/domain/repositories/auth_repository.dart';
import 'package:mynote_android/domain/repositories/folders_repository.dart';
import 'package:mynote_android/domain/repositories/notes_repository.dart';

final serverSettingsStorageProvider =
    Provider<ServerSettingsStorage>((ref) => ServerSettingsStorage());

final serverBaseUrlProvider =
    StateNotifierProvider<ServerBaseUrlController, AsyncValue<String>>(
  (ref) => ServerBaseUrlController(ref),
);

final apiClientProvider = Provider<ApiClient>((ref) {
  final baseUrlState = ref.watch(serverBaseUrlProvider);
  return ApiClient(
    baseUrl: baseUrlState.valueOrNull,
    tokenStorage: ref.watch(tokenStorageProvider),
  );
});

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final localNotesStorageProvider =
    Provider<LocalNotesStorage>((ref) => LocalNotesStorage());

final offlineModeProvider = StateNotifierProvider<OfflineModeController, bool>(
  (ref) => OfflineModeController(ref),
);

final themeModeStorageProvider =
    Provider<ThemeModeStorage>((ref) => ThemeModeStorage());

final appThemeModeProvider =
    StateNotifierProvider<AppThemeModeController, ThemeMode>(
  (ref) => AppThemeModeController(ref),
);

final noteFontSizeStorageProvider =
    Provider<NoteFontSizeStorage>((ref) => NoteFontSizeStorage());

final noteFontSizeProvider =
    StateNotifierProvider<NoteFontSizeController, NoteFontSize>(
  (ref) => NoteFontSizeController(ref),
);

final editorHtmlMapperProvider =
    Provider<EditorHtmlMapper>((ref) => const EditorHtmlMapper());

typedef EditorDocumentParser = Document Function(String html);

final editorDocumentParserProvider =
    Provider<EditorDocumentParser>((ref) => htmlToDocument);

final editorAutosaveServiceProvider =
    Provider<EditorAutosaveService>((ref) => EditorAutosaveService());

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(
    apiClient: ref.watch(apiClientProvider),
    tokenStorage: ref.watch(tokenStorageProvider),
  );
});

final notesRepositoryProvider = Provider<NotesRepository>((ref) {
  return OfflineNotesRepository(
    remote: NotesRepositoryImpl(apiClient: ref.watch(apiClientProvider)),
    localStorage: ref.watch(localNotesStorageProvider),
    offlineMode: ref.watch(offlineModeProvider),
    setOfflineMode: (value) =>
        ref.read(offlineModeProvider.notifier).setOfflineMode(value),
  );
});

final foldersRepositoryProvider = Provider<FoldersRepository>((ref) {
  return FoldersRepositoryImpl(apiClient: ref.watch(apiClientProvider));
});

class ServerBaseUrlController extends StateNotifier<AsyncValue<String>> {
  ServerBaseUrlController(this.ref) : super(const AsyncLoading()) {
    load();
  }

  final Ref ref;

  Future<void> load() async {
    final url = await ref.read(serverSettingsStorageProvider).readBaseUrl();
    state = AsyncData(url);
  }

  Future<void> save(String url) async {
    final normalized = url.trim().replaceAll(RegExp(r'/+$'), '');
    await ref.read(serverSettingsStorageProvider).saveBaseUrl(normalized);
    state = AsyncData(normalized);
  }
}

class AppThemeModeController extends StateNotifier<ThemeMode> {
  AppThemeModeController(this.ref) : super(ThemeMode.system) {
    load();
  }

  final Ref ref;

  Future<void> load() async {
    state = await ref.read(themeModeStorageProvider).readThemeMode();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    await ref.read(themeModeStorageProvider).saveThemeMode(mode);
    state = mode;
  }
}

class OfflineModeController extends StateNotifier<bool> {
  OfflineModeController(this.ref) : super(false) {
    load();
  }

  final Ref ref;

  Future<void> load() async {
    state = await ref.read(localNotesStorageProvider).readOfflineMode();
  }

  Future<void> setOfflineMode(bool value) async {
    await ref.read(localNotesStorageProvider).saveOfflineMode(value);
    state = value;
  }
}

class NoteFontSizeController extends StateNotifier<NoteFontSize> {
  NoteFontSizeController(this.ref) : super(NoteFontSize.medium) {
    load();
  }

  final Ref ref;

  Future<void> load() async {
    state = await ref.read(noteFontSizeStorageProvider).readFontSize();
  }

  Future<void> setFontSize(NoteFontSize size) async {
    await ref.read(noteFontSizeStorageProvider).saveFontSize(size);
    state = size;
  }
}
