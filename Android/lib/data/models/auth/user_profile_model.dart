import 'package:mynote_android/domain/entities/user_profile.dart';

class UserProfileModel {
  const UserProfileModel({
    required this.id,
    required this.username,
    required this.email,
    required this.isAdmin,
    this.avatar,
    this.trashRetentionDays,
    this.shareRetentionDays,
    this.webHomeLayout,
    this.webHomeDensity,
    this.storageUsage,
  });

  factory UserProfileModel.fromJson(Map<String, dynamic> json) {
    return UserProfileModel(
      id: '${json['id'] ?? ''}',
      username: '${json['username'] ?? ''}',
      email: json['email'] as String?,
      isAdmin: json['isAdmin'] == true,
      avatar: json['avatar'] as String?,
      trashRetentionDays: (json['trashRetentionDays'] as num?)?.toInt(),
      shareRetentionDays: (json['shareRetentionDays'] as num?)?.toInt(),
      webHomeLayout: json['webHomeLayout'] as String?,
      webHomeDensity: json['webHomeDensity'] as String?,
      storageUsage: (json['storageUsage'] as num?)?.toInt(),
    );
  }

  final String id;
  final String username;
  final String? email;
  final bool isAdmin;
  final String? avatar;
  final int? trashRetentionDays;
  final int? shareRetentionDays;
  final String? webHomeLayout;
  final String? webHomeDensity;
  final int? storageUsage;

  UserProfile toEntity() => UserProfile(
        id: id,
        username: username,
        email: email,
        isAdmin: isAdmin,
        avatar: avatar,
        trashRetentionDays: trashRetentionDays,
        shareRetentionDays: shareRetentionDays,
        webHomeLayout: webHomeLayout,
        webHomeDensity: webHomeDensity,
        storageUsage: storageUsage,
      );
}
