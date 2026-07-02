String normalizeServerBaseUrl(String raw) {
  var normalized = raw.trim().replaceAll(RegExp(r'/+$'), '');
  final parsed = Uri.tryParse(normalized);
  if (parsed != null && parsed.hasScheme && parsed.host.isNotEmpty) {
    final pathSegments = parsed.pathSegments;
    const frontendRoutes = {
      'login',
      'register',
      'notes',
      'note',
      'share',
      'settings',
    };
    Uri rebuild(String path) => Uri(
          scheme: parsed.scheme,
          userInfo: parsed.userInfo,
          host: parsed.host,
          port: parsed.hasPort ? parsed.port : null,
          path: path,
        );
    final apiIndex = pathSegments.indexOf('api');
    if (apiIndex >= 0) {
      normalized =
          rebuild('/${pathSegments.take(apiIndex + 1).join('/')}').toString();
    } else {
      final frontendIndex = pathSegments
          .indexWhere((segment) => frontendRoutes.contains(segment));
      final baseSegments =
          frontendIndex >= 0 ? pathSegments.take(frontendIndex) : pathSegments;
      final basePath = baseSegments.isEmpty ? '' : '/${baseSegments.join('/')}';
      normalized = rebuild(basePath).toString();
    }
  }
  normalized = normalized.replaceAll(RegExp(r'/+$'), '');
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
    final storagePath = storageServerAssetPath(
      baseUrl: trimmedBase,
      assetUrl: trimmedPath,
    );
    if (storagePath.startsWith('/uploads/')) {
      if (trimmedBase.isEmpty) return storagePath;
      return '$trimmedBase$storagePath';
    }
    return trimmedPath;
  }
  final path = trimmedPath.startsWith('/') ? trimmedPath : '/$trimmedPath';
  if (trimmedBase.isEmpty) return path;
  return '$trimmedBase$path';
}

String storageServerAssetPath({
  required String baseUrl,
  required String assetUrl,
}) {
  final trimmedUrl = assetUrl.trim();
  if (trimmedUrl.isEmpty) return '';
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }

  final normalizedBase = baseUrl.trim().replaceAll(RegExp(r'/+$'), '');
  if (normalizedBase.isNotEmpty &&
      trimmedUrl.toLowerCase().startsWith(normalizedBase.toLowerCase())) {
    final path = trimmedUrl.substring(normalizedBase.length);
    return path.isEmpty ? '/' : path;
  }

  final parsed = Uri.tryParse(trimmedUrl);
  if (parsed != null && parsed.path.startsWith('/uploads/')) {
    final query = parsed.hasQuery ? '?${parsed.query}' : '';
    return '${parsed.path}$query';
  }
  return trimmedUrl;
}

String resolveServerAssetReferences({
  required String html,
  required String baseUrl,
}) {
  if (html.trim().isEmpty) return html;
  return html.replaceAllMapped(
    RegExp(r'''\b(src|href)=(["'])((?:https?://[^"']+)?/uploads/[^"']+)\2''',
        caseSensitive: false),
    (match) {
      final name = match.group(1)!;
      final quote = match.group(2)!;
      final path = match.group(3)!;
      return '$name=$quote${resolveServerAssetUrl(baseUrl: baseUrl, assetPath: path)}$quote';
    },
  );
}

String storeServerAssetReferences({
  required String html,
  required String baseUrl,
}) {
  if (html.trim().isEmpty) return html;
  return html.replaceAllMapped(
    RegExp(r'''\b(src|href)=(["'])(https?://[^"']+/uploads/[^"']+)\2''',
        caseSensitive: false),
    (match) {
      final name = match.group(1)!;
      final quote = match.group(2)!;
      final url = match.group(3)!;
      return '$name=$quote${storageServerAssetPath(baseUrl: baseUrl, assetUrl: url)}$quote';
    },
  );
}
