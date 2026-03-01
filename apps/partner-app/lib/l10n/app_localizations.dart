import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_fr.dart';
import 'app_localizations_mfe.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('fr'),
    Locale('mfe')
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'BienBon Partner'**
  String get appTitle;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'BienBon Partner'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Manage your baskets, validate pickups and track your revenue.'**
  String get loginSubtitle;

  /// No description provided for @loginEmailLabel.
  ///
  /// In en, this message translates to:
  /// **'Partner email'**
  String get loginEmailLabel;

  /// No description provided for @loginPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get loginPasswordLabel;

  /// No description provided for @loginButton.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get loginButton;

  /// No description provided for @loginForgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get loginForgotPassword;

  /// No description provided for @loginNoAccount.
  ///
  /// In en, this message translates to:
  /// **'No partner account yet?\nContact us at partners@bienbon.mu'**
  String get loginNoAccount;

  /// No description provided for @dashboardTitle.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get dashboardTitle;

  /// No description provided for @dashboardGreeting.
  ///
  /// In en, this message translates to:
  /// **'Hello, {name}'**
  String dashboardGreeting(String name);

  /// No description provided for @dashboardSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Today\'s stats'**
  String get dashboardSubtitle;

  /// No description provided for @dashboardBasketsPublished.
  ///
  /// In en, this message translates to:
  /// **'Published baskets'**
  String get dashboardBasketsPublished;

  /// No description provided for @dashboardReservations.
  ///
  /// In en, this message translates to:
  /// **'Reservations'**
  String get dashboardReservations;

  /// No description provided for @dashboardPickupsValidated.
  ///
  /// In en, this message translates to:
  /// **'Validated pickups'**
  String get dashboardPickupsValidated;

  /// No description provided for @dashboardRevenue.
  ///
  /// In en, this message translates to:
  /// **'Revenue'**
  String get dashboardRevenue;

  /// No description provided for @dashboardWeeklySales.
  ///
  /// In en, this message translates to:
  /// **'This week\'s sales'**
  String get dashboardWeeklySales;

  /// No description provided for @dashboardQuickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get dashboardQuickActions;

  /// No description provided for @dashboardCreateBasket.
  ///
  /// In en, this message translates to:
  /// **'Create a basket'**
  String get dashboardCreateBasket;

  /// No description provided for @dashboardScanPickup.
  ///
  /// In en, this message translates to:
  /// **'Scan a pickup'**
  String get dashboardScanPickup;

  /// No description provided for @dashboardMyStores.
  ///
  /// In en, this message translates to:
  /// **'My stores'**
  String get dashboardMyStores;

  /// No description provided for @dashboardRecentActivity.
  ///
  /// In en, this message translates to:
  /// **'Recent activity'**
  String get dashboardRecentActivity;

  /// No description provided for @basketsTitle.
  ///
  /// In en, this message translates to:
  /// **'My baskets'**
  String get basketsTitle;

  /// No description provided for @basketCreate.
  ///
  /// In en, this message translates to:
  /// **'Create a basket'**
  String get basketCreate;

  /// No description provided for @basketEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get basketEdit;

  /// No description provided for @basketPublish.
  ///
  /// In en, this message translates to:
  /// **'Publish'**
  String get basketPublish;

  /// No description provided for @basketUnpublish.
  ///
  /// In en, this message translates to:
  /// **'Unpublish'**
  String get basketUnpublish;

  /// No description provided for @basketStock.
  ///
  /// In en, this message translates to:
  /// **'Stock'**
  String get basketStock;

  /// No description provided for @basketOriginalPrice.
  ///
  /// In en, this message translates to:
  /// **'Original price'**
  String get basketOriginalPrice;

  /// No description provided for @basketDiscountedPrice.
  ///
  /// In en, this message translates to:
  /// **'Discounted price'**
  String get basketDiscountedPrice;

  /// No description provided for @basketCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get basketCategory;

  /// No description provided for @basketPickupTime.
  ///
  /// In en, this message translates to:
  /// **'Pickup time'**
  String get basketPickupTime;

  /// No description provided for @basketStatusDraft.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get basketStatusDraft;

  /// No description provided for @basketStatusPublished.
  ///
  /// In en, this message translates to:
  /// **'Published'**
  String get basketStatusPublished;

  /// No description provided for @basketStatusSoldOut.
  ///
  /// In en, this message translates to:
  /// **'Sold out'**
  String get basketStatusSoldOut;

  /// No description provided for @basketReservationsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} reservation(s)'**
  String basketReservationsCount(int count);

  /// No description provided for @pickupTitle.
  ///
  /// In en, this message translates to:
  /// **'Validate a pickup'**
  String get pickupTitle;

  /// No description provided for @pickupScanQr.
  ///
  /// In en, this message translates to:
  /// **'Scan QR'**
  String get pickupScanQr;

  /// No description provided for @pickupEnterPin.
  ///
  /// In en, this message translates to:
  /// **'Enter PIN'**
  String get pickupEnterPin;

  /// No description provided for @pickupValidate.
  ///
  /// In en, this message translates to:
  /// **'Validate pickup'**
  String get pickupValidate;

  /// No description provided for @pickupConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Pickup confirmed!'**
  String get pickupConfirmed;

  /// No description provided for @pickupSuccess.
  ///
  /// In en, this message translates to:
  /// **'The pickup has been successfully validated.'**
  String get pickupSuccess;

  /// No description provided for @pickupScanAnother.
  ///
  /// In en, this message translates to:
  /// **'Scan another pickup'**
  String get pickupScanAnother;

  /// No description provided for @pickupPinHint.
  ///
  /// In en, this message translates to:
  /// **'0000'**
  String get pickupPinHint;

  /// No description provided for @pickupPinInstruction.
  ///
  /// In en, this message translates to:
  /// **'The customer must give you their 4-digit PIN.'**
  String get pickupPinInstruction;

  /// No description provided for @reservationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Reservations'**
  String get reservationsTitle;

  /// No description provided for @reservationDetail.
  ///
  /// In en, this message translates to:
  /// **'Reservation detail'**
  String get reservationDetail;

  /// No description provided for @reservationStatusConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get reservationStatusConfirmed;

  /// No description provided for @reservationStatusReady.
  ///
  /// In en, this message translates to:
  /// **'Ready'**
  String get reservationStatusReady;

  /// No description provided for @reservationStatusPickedUp.
  ///
  /// In en, this message translates to:
  /// **'Picked up'**
  String get reservationStatusPickedUp;

  /// No description provided for @reservationStatusNoShow.
  ///
  /// In en, this message translates to:
  /// **'No show'**
  String get reservationStatusNoShow;

  /// No description provided for @reservationCode.
  ///
  /// In en, this message translates to:
  /// **'Pickup code'**
  String get reservationCode;

  /// No description provided for @reservationValidate.
  ///
  /// In en, this message translates to:
  /// **'Validate pickup'**
  String get reservationValidate;

  /// No description provided for @revenueTitle.
  ///
  /// In en, this message translates to:
  /// **'My payouts'**
  String get revenueTitle;

  /// No description provided for @revenueCurrent.
  ///
  /// In en, this message translates to:
  /// **'Gross revenue'**
  String get revenueCurrent;

  /// No description provided for @revenueCommission.
  ///
  /// In en, this message translates to:
  /// **'BienBon commission (25%)'**
  String get revenueCommission;

  /// No description provided for @revenueNet.
  ///
  /// In en, this message translates to:
  /// **'Partner net'**
  String get revenueNet;

  /// No description provided for @revenueHistory.
  ///
  /// In en, this message translates to:
  /// **'Payout history'**
  String get revenueHistory;

  /// No description provided for @revenueThisMonth.
  ///
  /// In en, this message translates to:
  /// **'This month'**
  String get revenueThisMonth;

  /// No description provided for @revenuePaid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get revenuePaid;

  /// No description provided for @profileTitle.
  ///
  /// In en, this message translates to:
  /// **'Profile & Settings'**
  String get profileTitle;

  /// No description provided for @profileMyStore.
  ///
  /// In en, this message translates to:
  /// **'My store'**
  String get profileMyStore;

  /// No description provided for @profileHours.
  ///
  /// In en, this message translates to:
  /// **'Store hours'**
  String get profileHours;

  /// No description provided for @profileMyStores.
  ///
  /// In en, this message translates to:
  /// **'My stores'**
  String get profileMyStores;

  /// No description provided for @profilePayouts.
  ///
  /// In en, this message translates to:
  /// **'Payouts'**
  String get profilePayouts;

  /// No description provided for @profileNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get profileNotifications;

  /// No description provided for @profileLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get profileLanguage;

  /// No description provided for @profileHelp.
  ///
  /// In en, this message translates to:
  /// **'Help & Support'**
  String get profileHelp;

  /// No description provided for @profileTerms.
  ///
  /// In en, this message translates to:
  /// **'Partner terms'**
  String get profileTerms;

  /// No description provided for @profilePrivacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy policy'**
  String get profilePrivacy;

  /// No description provided for @profileLogout.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get profileLogout;

  /// No description provided for @profileLogoutConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to sign out?'**
  String get profileLogoutConfirm;

  /// No description provided for @profileVerified.
  ///
  /// In en, this message translates to:
  /// **'Verified partner'**
  String get profileVerified;

  /// No description provided for @storeActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get storeActive;

  /// No description provided for @storeSuspended.
  ///
  /// In en, this message translates to:
  /// **'Suspended'**
  String get storeSuspended;

  /// No description provided for @storePending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get storePending;

  /// No description provided for @storeDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Store detail'**
  String get storeDetailTitle;

  /// No description provided for @commonSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get commonSave;

  /// No description provided for @commonCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get commonCancel;

  /// No description provided for @commonConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get commonConfirm;

  /// No description provided for @commonClose.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get commonClose;

  /// No description provided for @commonLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading...'**
  String get commonLoading;

  /// No description provided for @commonRequired.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get commonRequired;

  /// No description provided for @commonError.
  ///
  /// In en, this message translates to:
  /// **'An error occurred'**
  String get commonError;

  /// No description provided for @commonSuccess.
  ///
  /// In en, this message translates to:
  /// **'Success'**
  String get commonSuccess;
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['en', 'fr', 'mfe'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {


  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en': return AppLocalizationsEn();
    case 'fr': return AppLocalizationsFr();
    case 'mfe': return AppLocalizationsMfe();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.'
  );
}
