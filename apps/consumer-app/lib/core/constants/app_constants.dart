/// Application-wide constants for BienBon consumer app.
abstract final class AppConstants {
  // -------------------------------------------------------------------------
  // API
  // -------------------------------------------------------------------------
  static const String apiBaseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: 'https://api.bienbon.mu/v1');

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  // -------------------------------------------------------------------------
  // Cache TTL (seconds)
  // -------------------------------------------------------------------------
  static const int basketCacheTtl = 300; // 5 minutes
  static const int storeCacheTtl = 3600; // 1 hour

  // -------------------------------------------------------------------------
  // App metadata
  // -------------------------------------------------------------------------
  static const String appName = 'BienBon';
  static const String appTagline = 'Sauvez des paniers surprise !';

  // -------------------------------------------------------------------------
  // Storage keys
  // -------------------------------------------------------------------------
  static const String keyAuthToken = 'auth_token';
  static const String keyRefreshToken = 'refresh_token';
  static const String keyOnboardingDone = 'onboarding_done';
  static const String keyLocale = 'locale';

  // -------------------------------------------------------------------------
  // Supported locales
  // -------------------------------------------------------------------------
  static const List<String> supportedLocales = ['fr', 'en', 'mfe'];
  static const String defaultLocale = 'fr';
}
