/// Named route constants for GoRouter.
/// Centralises all route names to avoid magic strings.
abstract final class RouteNames {
  // Auth
  static const String login = 'login';
  static const String register = 'register';
  static const String onboarding = 'onboarding';

  // Shell tabs
  static const String home = 'home';
  static const String explore = 'explore';
  static const String orders = 'orders';
  static const String favorites = 'favorites';
  static const String profile = 'profile';

  // Detail routes
  static const String storeDetail = 'store-detail';
  static const String basketDetail = 'basket-detail';
  static const String reservation = 'reservation';
  static const String payment = 'payment';
  static const String confirmation = 'confirmation';
  static const String qrPickup = 'qr-pickup';
}

/// Route path constants.
abstract final class RoutePaths {
  // Auth
  static const String login = '/login';
  static const String register = '/register';
  static const String onboarding = '/onboarding';

  // Shell root paths
  static const String home = '/home';
  static const String explore = '/explore';
  static const String orders = '/orders';
  static const String favorites = '/favorites';
  static const String profile = '/profile';

  // Detail paths (nested under home)
  static const String storeDetail = 'store/:storeId';
  static const String basketDetail = 'basket/:basketId';
  static const String reservation = 'reservation/:basketId';
  static const String payment = 'payment/:reservationId';
  static const String confirmation = 'confirmation/:reservationId';
  static const String qrPickup = 'pickup/:reservationId';
}
