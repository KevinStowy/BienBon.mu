import 'package:flutter/foundation.dart';

/// Analytics event names for the partner app.
abstract final class AnalyticsEvents {
  static const screenView = 'screen_view';
  static const basketCreated = 'basket_created';
  static const basketPublished = 'basket_published';
  static const stockUpdated = 'stock_updated';
  static const pickupScanned = 'pickup_scanned';
  static const pickupValidated = 'pickup_validated';
  static const reservationViewed = 'reservation_viewed';
  static const revenueViewed = 'revenue_viewed';
  static const loginCompleted = 'login_completed';
}

/// Abstract analytics service — swap implementation for Firebase/PostHog later.
abstract class AnalyticsService {
  void logEvent(String name, [Map<String, Object>? parameters]);
  void logScreenView(String screenName);
  void setUserId(String? userId);
  void setUserProperty(String name, String value);
}

/// Debug implementation that prints to console in debug mode.
class DebugAnalyticsService implements AnalyticsService {
  @override
  void logEvent(String name, [Map<String, Object>? parameters]) {
    if (kDebugMode) {
      debugPrint('[Analytics] $name ${parameters ?? ''}');
    }
  }

  @override
  void logScreenView(String screenName) {
    logEvent(AnalyticsEvents.screenView, {'screen_name': screenName});
  }

  @override
  void setUserId(String? userId) {
    if (kDebugMode) {
      debugPrint('[Analytics] setUserId: $userId');
    }
  }

  @override
  void setUserProperty(String name, String value) {
    if (kDebugMode) {
      debugPrint('[Analytics] setUserProperty: $name=$value');
    }
  }
}
