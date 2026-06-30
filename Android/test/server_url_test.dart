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
}
