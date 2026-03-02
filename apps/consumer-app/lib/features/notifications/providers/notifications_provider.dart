import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/models/notification_item.dart';
import '../../../shared/repositories/notification_repository.dart';

/// Manages notification list with read/unread state.
class NotificationsNotifier
    extends StateNotifier<AsyncValue<List<NotificationItem>>> {
  NotificationsNotifier(this._repo) : super(const AsyncValue.loading()) {
    _load();
  }

  final NotificationRepository _repo;

  Future<void> _load() async {
    try {
      final items = await _repo.getNotifications();
      state = AsyncValue.data(items);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  int get unreadCount {
    return state.when(
      data: (items) => items.where((n) => !n.isRead).length,
      loading: () => 0,
      error: (_, __) => 0,
    );
  }

  Future<void> markAsRead(String id) async {
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(
      current.map((n) => n.id == id ? n.copyWith(isRead: true) : n).toList(),
    );
    try {
      await _repo.markAsRead(id);
    } catch (_) {
      // Revert on error
      await _load();
    }
  }

  Future<void> markAllAsRead() async {
    final current = state.valueOrNull ?? [];
    state = AsyncValue.data(
      current.map((n) => n.copyWith(isRead: true)).toList(),
    );
    try {
      await _repo.markAllAsRead();
    } catch (_) {
      await _load();
    }
  }

  Future<void> refresh() async => _load();
}

final notificationsProvider = StateNotifierProvider<NotificationsNotifier,
    AsyncValue<List<NotificationItem>>>((ref) {
  final repo = ref.watch(notificationRepositoryProvider);
  return NotificationsNotifier(repo);
});

/// Unread notification count for badges.
final unreadNotificationCountProvider = Provider<int>((ref) {
  return ref.watch(notificationsProvider).when(
        data: (items) => items.where((n) => !n.isRead).length,
        loading: () => 0,
        error: (_, __) => 0,
      );
});
