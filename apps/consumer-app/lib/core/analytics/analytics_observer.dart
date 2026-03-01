import 'package:flutter/material.dart';

import 'analytics_service.dart';

/// A [NavigatorObserver] that automatically logs screen views to [AnalyticsService].
///
/// Wire this into GoRouter's [observers] list so every navigation event is
/// tracked without boilerplate in individual screens.
class AnalyticsRouteObserver extends NavigatorObserver {
  AnalyticsRouteObserver(this._analytics);

  final AnalyticsService _analytics;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    if (route.settings.name != null) {
      _analytics.logScreenView(route.settings.name!);
    }
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    if (newRoute?.settings.name != null) {
      _analytics.logScreenView(newRoute!.settings.name!);
    }
  }
}
