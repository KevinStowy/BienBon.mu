/// App-wide constants for BienBon Partner App.
abstract final class AppConstants {
  // SharedPreferences keys
  static const String keyAuthToken = 'partner_auth_token';
  static const String keyPartnerId = 'partner_id';
  static const String keyPartnerEmail = 'partner_email';
  static const String keyPartnerName = 'partner_name';

  // API
  static const String baseUrl = 'https://api.bienbon.mu/v1';

  // Commission rate
  static const double commissionRate = 0.25;

  // Demo data
  static const String demoToken = 'demo-partner-token-2024';
}
