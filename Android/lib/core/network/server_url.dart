String normalizeServerBaseUrl(String raw) {
  final normalized = raw.trim().replaceAll(RegExp(r'/+$'), '');
  if (normalized.endsWith('/api')) {
    return normalized;
  }
  return '$normalized/api';
}

String resolveServerAssetUrl({
  required String baseUrl,
  required String assetPath,
}) {
  final trimmedBase = baseUrl.trim().replaceAll(RegExp(r'/+$'), '');
  final trimmedPath = assetPath.trim();
  if (trimmedPath.isEmpty) return '';
  if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
    return trimmedPath;
  }
  final path = trimmedPath.startsWith('/') ? trimmedPath : '/$trimmedPath';
  if (trimmedBase.isEmpty) return path;
  return '$trimmedBase$path';
}
