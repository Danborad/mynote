class UserProfile {
  const UserProfile({
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
}
