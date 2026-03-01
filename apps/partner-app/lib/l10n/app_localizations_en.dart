// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'BienBon Partner';

  @override
  String get loginTitle => 'BienBon Partner';

  @override
  String get loginSubtitle => 'Manage your baskets, validate pickups and track your revenue.';

  @override
  String get loginEmailLabel => 'Partner email';

  @override
  String get loginPasswordLabel => 'Password';

  @override
  String get loginButton => 'Sign in';

  @override
  String get loginForgotPassword => 'Forgot password?';

  @override
  String get loginNoAccount => 'No partner account yet?\nContact us at partners@bienbon.mu';

  @override
  String get dashboardTitle => 'Dashboard';

  @override
  String dashboardGreeting(String name) {
    return 'Hello, $name';
  }

  @override
  String get dashboardSubtitle => 'Today\'s stats';

  @override
  String get dashboardBasketsPublished => 'Published baskets';

  @override
  String get dashboardReservations => 'Reservations';

  @override
  String get dashboardPickupsValidated => 'Validated pickups';

  @override
  String get dashboardRevenue => 'Revenue';

  @override
  String get dashboardWeeklySales => 'This week\'s sales';

  @override
  String get dashboardQuickActions => 'Quick actions';

  @override
  String get dashboardCreateBasket => 'Create a basket';

  @override
  String get dashboardScanPickup => 'Scan a pickup';

  @override
  String get dashboardMyStores => 'My stores';

  @override
  String get dashboardRecentActivity => 'Recent activity';

  @override
  String get basketsTitle => 'My baskets';

  @override
  String get basketCreate => 'Create a basket';

  @override
  String get basketEdit => 'Edit';

  @override
  String get basketPublish => 'Publish';

  @override
  String get basketUnpublish => 'Unpublish';

  @override
  String get basketStock => 'Stock';

  @override
  String get basketOriginalPrice => 'Original price';

  @override
  String get basketDiscountedPrice => 'Discounted price';

  @override
  String get basketCategory => 'Category';

  @override
  String get basketPickupTime => 'Pickup time';

  @override
  String get basketStatusDraft => 'Draft';

  @override
  String get basketStatusPublished => 'Published';

  @override
  String get basketStatusSoldOut => 'Sold out';

  @override
  String basketReservationsCount(int count) {
    return '$count reservation(s)';
  }

  @override
  String get pickupTitle => 'Validate a pickup';

  @override
  String get pickupScanQr => 'Scan QR';

  @override
  String get pickupEnterPin => 'Enter PIN';

  @override
  String get pickupValidate => 'Validate pickup';

  @override
  String get pickupConfirmed => 'Pickup confirmed!';

  @override
  String get pickupSuccess => 'The pickup has been successfully validated.';

  @override
  String get pickupScanAnother => 'Scan another pickup';

  @override
  String get pickupPinHint => '0000';

  @override
  String get pickupPinInstruction => 'The customer must give you their 4-digit PIN.';

  @override
  String get reservationsTitle => 'Reservations';

  @override
  String get reservationDetail => 'Reservation detail';

  @override
  String get reservationStatusConfirmed => 'Confirmed';

  @override
  String get reservationStatusReady => 'Ready';

  @override
  String get reservationStatusPickedUp => 'Picked up';

  @override
  String get reservationStatusNoShow => 'No show';

  @override
  String get reservationCode => 'Pickup code';

  @override
  String get reservationValidate => 'Validate pickup';

  @override
  String get revenueTitle => 'My payouts';

  @override
  String get revenueCurrent => 'Gross revenue';

  @override
  String get revenueCommission => 'BienBon commission (25%)';

  @override
  String get revenueNet => 'Partner net';

  @override
  String get revenueHistory => 'Payout history';

  @override
  String get revenueThisMonth => 'This month';

  @override
  String get revenuePaid => 'Paid';

  @override
  String get profileTitle => 'Profile & Settings';

  @override
  String get profileMyStore => 'My store';

  @override
  String get profileHours => 'Store hours';

  @override
  String get profileMyStores => 'My stores';

  @override
  String get profilePayouts => 'Payouts';

  @override
  String get profileNotifications => 'Notifications';

  @override
  String get profileLanguage => 'Language';

  @override
  String get profileHelp => 'Help & Support';

  @override
  String get profileTerms => 'Partner terms';

  @override
  String get profilePrivacy => 'Privacy policy';

  @override
  String get profileLogout => 'Sign out';

  @override
  String get profileLogoutConfirm => 'Are you sure you want to sign out?';

  @override
  String get profileVerified => 'Verified partner';

  @override
  String get storeActive => 'Active';

  @override
  String get storeSuspended => 'Suspended';

  @override
  String get storePending => 'Pending';

  @override
  String get storeDetailTitle => 'Store detail';

  @override
  String get commonSave => 'Save';

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonConfirm => 'Confirm';

  @override
  String get commonClose => 'Close';

  @override
  String get commonLoading => 'Loading...';

  @override
  String get commonRequired => 'Required';

  @override
  String get commonError => 'An error occurred';

  @override
  String get commonSuccess => 'Success';
}
