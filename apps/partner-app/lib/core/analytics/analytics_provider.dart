import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'analytics_service.dart';

/// Riverpod provider for the [AnalyticsService].
///
/// Swap [DebugAnalyticsService] for a Firebase or PostHog implementation once
/// the corresponding SDK is configured.
final analyticsProvider = Provider<AnalyticsService>((ref) {
  return DebugAnalyticsService();
});
