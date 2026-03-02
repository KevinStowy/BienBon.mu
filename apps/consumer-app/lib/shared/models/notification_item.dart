/// In-app notification model (US-C062).
enum NotificationType {
  favoriteNewBasket,
  reservationConfirmed,
  pickupReminder,
  cancelledByPartner,
  refundProcessed,
  noShow,
  claimResolved,
  badgeUnlocked,
  referralValidated,
}

class NotificationItem {
  const NotificationItem({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.createdAt,
    this.isRead = false,
    this.targetId,
    this.targetType,
  });

  final String id;
  final NotificationType type;
  final String title;
  final String body;
  final DateTime createdAt;
  final bool isRead;
  final String? targetId;
  final String? targetType;

  NotificationItem copyWith({bool? isRead}) {
    return NotificationItem(
      id: id,
      type: type,
      title: title,
      body: body,
      createdAt: createdAt,
      isRead: isRead ?? this.isRead,
      targetId: targetId,
      targetType: targetType,
    );
  }

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] as String,
      type: _parseType(json['type'] as String?),
      title: json['title'] as String,
      body: json['body'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      isRead: json['isRead'] as bool? ?? false,
      targetId: json['targetId'] as String?,
      targetType: json['targetType'] as String?,
    );
  }

  static NotificationType _parseType(String? type) {
    return switch (type) {
      'favorite_new_basket' => NotificationType.favoriteNewBasket,
      'reservation_confirmed' => NotificationType.reservationConfirmed,
      'pickup_reminder' => NotificationType.pickupReminder,
      'cancelled_by_partner' => NotificationType.cancelledByPartner,
      'refund_processed' => NotificationType.refundProcessed,
      'no_show' => NotificationType.noShow,
      'claim_resolved' => NotificationType.claimResolved,
      'badge_unlocked' => NotificationType.badgeUnlocked,
      'referral_validated' => NotificationType.referralValidated,
      _ => NotificationType.favoriteNewBasket,
    };
  }
}
