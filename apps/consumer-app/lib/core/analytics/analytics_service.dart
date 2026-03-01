import 'package:flutter/foundation.dart';

/// Analytics event names for the consumer app.
abstract final class AnalyticsEvents {
  static const screenView = 'screen_view';
  static const basketViewed = 'basket_viewed';
  static const basketReserved = 'basket_reserved';
  static const paymentStarted = 'payment_started';
  static const paymentCompleted = 'payment_completed';
  static const pickupCompleted = 'pickup_completed';
  static const storeViewed = 'store_viewed';
  static const searchPerformed = 'search_performed';
  static const favoriteToggled = 'favorite_toggled';
  static const loginCompleted = 'login_completed';
  static const signupCompleted = 'signup_completed';
  static const referralShared = 'referral_shared';
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
