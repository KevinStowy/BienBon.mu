/// Named route constants for GoRouter — Partner App.
abstract final class RouteNames {
  // Auth
  static const String login = 'login';

  // Shell tabs
  static const String dashboard = 'dashboard';
  static const String baskets = 'baskets';
  static const String pickupScan = 'pickup-scan';
  static const String profile = 'profile';

  // Sub-routes
  static const String storesList = 'stores-list';
  static const String storeDetail = 'store-detail';
  static const String basketCreate = 'basket-create';
  static const String basketDetail = 'basket-detail';
  static const String basketEdit = 'basket-edit';
  static const String manageStock = 'manage-stock';
  static const String pickupConfirmation = 'pickup-confirmation';
  static const String reservations = 'reservations';
  static const String reservationDetail = 'reservation-detail';
  static const String revenue = 'revenue';
}

/// Route path constants — Partner App.
abstract final class RoutePaths {
  // Auth
  static const String login = '/login';

  // Shell roots
  static const String dashboard = '/dashboard';
  static const String baskets = '/baskets';
  static const String pickupScan = '/pickup/scan';
  static const String profile = '/profile';

  // Sub-routes (nested or full paths)
  static const String storesList = 'stores';
  static const String storeDetail = 'stores/:storeId';
  static const String basketCreate = 'create';
  static const String basketDetail = ':basketId';
  static const String basketEdit = ':basketId/edit';
  static const String manageStock = ':basketId/stock';
  static const String pickupConfirmation = '/pickup/confirmation';
  static const String reservations = '/reservations';
  static const String reservationDetail = ':reservationId';
  static const String revenue = '/revenue';
}
