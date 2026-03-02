import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers/api_provider.dart';
import '../models/notification_item.dart';

/// Repository for notification operations.
class NotificationRepository {
  NotificationRepository(this._api);
  final ApiClient _api;

  Future<List<NotificationItem>> getNotifications() async {
    final data = await _api.get('/api/notifications');
    if (data is List) {
      return data
          .map((e) => NotificationItem.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => NotificationItem.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<void> markAsRead(String id) async {
    await _api.patch('/api/notifications/$id/read');
  }

  Future<void> markAllAsRead() async {
    await _api.patch('/api/notifications/read-all');
  }
}

final notificationRepositoryProvider =
    Provider<NotificationRepository>((ref) {
  return NotificationRepository(ref.watch(apiClientProvider));
});
