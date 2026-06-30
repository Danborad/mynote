import 'package:flutter_test/flutter_test.dart';
import 'package:mynote_android/core/network/server_url.dart';

void main() {
  test('normalizeServerBaseUrl keeps IPv6 domain bases intact', () {
    expect(
      normalizeServerBaseUrl('http://notes.example.com'),
      'http://notes.example.com/api',
    );
    expect(
      normalizeServerBaseUrl('http://[2001:db8::1]:3665/'),
      'http://[2001:db8::1]:3665/api',
    );
  });

  test('resolveServerAssetUrl uses the current server base url', () {
    expect(
      resolveServerAssetUrl(
        baseUrl: 'http://notes.example.com',
        assetPath: '/uploads/avatar.png',
      ),
      'http://notes.example.com/uploads/avatar.png',
    );
    expect(
      resolveServerAssetUrl(
        baseUrl: 'http://[2001:db8::1]:3665',
        assetPath: 'uploads/avatar.png',
      ),
      'http://[2001:db8::1]:3665/uploads/avatar.png',
    );
  });

  test('asset references are stored relative and resolved for display', () {
    const baseUrl = 'https://notes.example.com';
    const stored = '<p><img src="/uploads/attachments/a.png" alt="image"></p>';

    expect(
      resolveServerAssetReferences(html: stored, baseUrl: baseUrl),
      '<p><img src="https://notes.example.com/uploads/attachments/a.png" alt="image"></p>',
    );
    expect(
      storeServerAssetReferences(
        html:
            '<p><img src="https://notes.example.com/uploads/attachments/a.png" alt="image"></p>',
        baseUrl: baseUrl,
      ),
      stored,
    );
  });
}
