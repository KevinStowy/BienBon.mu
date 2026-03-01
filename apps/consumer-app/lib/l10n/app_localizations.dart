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

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'BienBon'**
  String get appName;

  /// No description provided for @appTagline.
  ///
  /// In en, this message translates to:
  /// **'Save surprise baskets!'**
  String get appTagline;

  /// No description provided for @tabHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get tabHome;

  /// No description provided for @tabExplore.
  ///
  /// In en, this message translates to:
  /// **'Explore'**
  String get tabExplore;

  /// No description provided for @tabOrders.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get tabOrders;

  /// No description provided for @tabFavorites.
  ///
  /// In en, this message translates to:
  /// **'Favourites'**
  String get tabFavorites;

  /// No description provided for @tabProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get tabProfile;

  /// No description provided for @onboardingTitle1.
  ///
  /// In en, this message translates to:
  /// **'Save baskets'**
  String get onboardingTitle1;

  /// No description provided for @onboardingSubtitle1.
  ///
  /// In en, this message translates to:
  /// **'Pick up surprise baskets from local shops at a reduced price and help reduce food waste in Mauritius.'**
  String get onboardingSubtitle1;

  /// No description provided for @onboardingTitle2.
  ///
  /// In en, this message translates to:
  /// **'Simple & quick pickup'**
  String get onboardingTitle2;

  /// No description provided for @onboardingSubtitle2.
  ///
  /// In en, this message translates to:
  /// **'Book in a few taps and show your QR code at pickup. Simple, fast, contactless.'**
  String get onboardingSubtitle2;

  /// No description provided for @onboardingTitle3.
  ///
  /// In en, this message translates to:
  /// **'Act for the planet'**
  String get onboardingTitle3;

  /// No description provided for @onboardingSubtitle3.
  ///
  /// In en, this message translates to:
  /// **'Every saved basket avoids 1.2 kg of CO2. Together, let\'s protect our beautiful island!'**
  String get onboardingSubtitle3;

  /// No description provided for @onboardingSkip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get onboardingSkip;

  /// No description provided for @onboardingNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get onboardingNext;

  /// No description provided for @onboardingGetStarted.
  ///
  /// In en, this message translates to:
  /// **'Get started'**
  String get onboardingGetStarted;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Log in'**
  String get loginTitle;

  /// No description provided for @loginEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get loginEmail;

  /// No description provided for @loginPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get loginPassword;

  /// No description provided for @loginButton.
  ///
  /// In en, this message translates to:
  /// **'Log in'**
  String get loginButton;

  /// No description provided for @loginNoAccount.
  ///
  /// In en, this message translates to:
  /// **'No account yet?'**
  String get loginNoAccount;

  /// No description provided for @loginRegisterLink.
  ///
  /// In en, this message translates to:
  /// **'Sign up'**
  String get loginRegisterLink;

  /// No description provided for @loginEmailHint.
  ///
  /// In en, this message translates to:
  /// **'you@example.com'**
  String get loginEmailHint;

  /// No description provided for @loginPasswordHint.
  ///
  /// In en, this message translates to:
  /// **'••••••••'**
  String get loginPasswordHint;

  /// No description provided for @loginEmailRequired.
  ///
  /// In en, this message translates to:
  /// **'Please enter your email'**
  String get loginEmailRequired;

  /// No description provided for @loginEmailInvalid.
  ///
  /// In en, this message translates to:
  /// **'Invalid email'**
  String get loginEmailInvalid;

  /// No description provided for @loginPasswordRequired.
  ///
  /// In en, this message translates to:
  /// **'Please enter your password'**
  String get loginPasswordRequired;

  /// No description provided for @registerTitle.
  ///
  /// In en, this message translates to:
  /// **'Create an account'**
  String get registerTitle;

  /// No description provided for @registerName.
  ///
  /// In en, this message translates to:
  /// **'First and last name'**
  String get registerName;

  /// No description provided for @registerNameHint.
  ///
  /// In en, this message translates to:
  /// **'Marie Dupont'**
  String get registerNameHint;

  /// No description provided for @registerEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get registerEmail;

  /// No description provided for @registerPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get registerPassword;

  /// No description provided for @registerConfirmPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm password'**
  String get registerConfirmPassword;

  /// No description provided for @registerButton.
  ///
  /// In en, this message translates to:
  /// **'Create my account'**
  String get registerButton;

  /// No description provided for @registerAlreadyAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account?'**
  String get registerAlreadyAccount;

  /// No description provided for @registerLoginLink.
  ///
  /// In en, this message translates to:
  /// **'Log in'**
  String get registerLoginLink;

  /// No description provided for @homeHeroTitle.
  ///
  /// In en, this message translates to:
  /// **'Save surprise baskets!'**
  String get homeHeroTitle;

  /// No description provided for @homeHeroSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Up to -70% off today\'s unsold items'**
  String get homeHeroSubtitle;

  /// No description provided for @homeNearMeSection.
  ///
  /// In en, this message translates to:
  /// **'Near me'**
  String get homeNearMeSection;

  /// No description provided for @homeBasketsSection.
  ///
  /// In en, this message translates to:
  /// **'Baskets of the moment'**
  String get homeBasketsSection;

  /// No description provided for @homeSeeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get homeSeeAll;

  /// No description provided for @exploreTitle.
  ///
  /// In en, this message translates to:
  /// **'Explore'**
  String get exploreTitle;

  /// No description provided for @exploreSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search for a basket or shop...'**
  String get exploreSearchHint;

  /// No description provided for @exploreCategoryAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get exploreCategoryAll;

  /// No description provided for @exploreCategoryBakery.
  ///
  /// In en, this message translates to:
  /// **'Bakery'**
  String get exploreCategoryBakery;

  /// No description provided for @exploreCategoryRestaurant.
  ///
  /// In en, this message translates to:
  /// **'Restaurant'**
  String get exploreCategoryRestaurant;

  /// No description provided for @exploreCategorySupermarket.
  ///
  /// In en, this message translates to:
  /// **'Supermarket'**
  String get exploreCategorySupermarket;

  /// No description provided for @exploreCategoryCafe.
  ///
  /// In en, this message translates to:
  /// **'Cafe'**
  String get exploreCategoryCafe;

  /// No description provided for @exploreResultsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} baskets found'**
  String exploreResultsCount(int count);

  /// No description provided for @exploreNoResults.
  ///
  /// In en, this message translates to:
  /// **'No baskets found'**
  String get exploreNoResults;

  /// No description provided for @exploreNoResultsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Try a different search'**
  String get exploreNoResultsSubtitle;

  /// No description provided for @basketDetailReserveButton.
  ///
  /// In en, this message translates to:
  /// **'Reserve this basket'**
  String get basketDetailReserveButton;

  /// No description provided for @basketDetailPickupWindow.
  ///
  /// In en, this message translates to:
  /// **'Pickup window'**
  String get basketDetailPickupWindow;

  /// No description provided for @basketDetailAllergens.
  ///
  /// In en, this message translates to:
  /// **'Possible allergens'**
  String get basketDetailAllergens;

  /// No description provided for @basketDetailDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get basketDetailDescription;

  /// No description provided for @reservationTitle.
  ///
  /// In en, this message translates to:
  /// **'Summary'**
  String get reservationTitle;

  /// No description provided for @reservationStore.
  ///
  /// In en, this message translates to:
  /// **'Shop'**
  String get reservationStore;

  /// No description provided for @reservationAddress.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get reservationAddress;

  /// No description provided for @reservationPickup.
  ///
  /// In en, this message translates to:
  /// **'Pickup window'**
  String get reservationPickup;

  /// No description provided for @reservationQuantity.
  ///
  /// In en, this message translates to:
  /// **'Quantity'**
  String get reservationQuantity;

  /// No description provided for @reservationOriginalPrice.
  ///
  /// In en, this message translates to:
  /// **'Original price'**
  String get reservationOriginalPrice;

  /// No description provided for @reservationDiscount.
  ///
  /// In en, this message translates to:
  /// **'BienBon discount'**
  String get reservationDiscount;

  /// No description provided for @reservationTotal.
  ///
  /// In en, this message translates to:
  /// **'Total to pay'**
  String get reservationTotal;

  /// No description provided for @reservationConfirmButton.
  ///
  /// In en, this message translates to:
  /// **'Confirm and pay'**
  String get reservationConfirmButton;

  /// No description provided for @reservationCancelButton.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get reservationCancelButton;

  /// No description provided for @paymentTitle.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get paymentTitle;

  /// No description provided for @paymentMethodCard.
  ///
  /// In en, this message translates to:
  /// **'Credit card'**
  String get paymentMethodCard;

  /// No description provided for @paymentMethodCardSub.
  ///
  /// In en, this message translates to:
  /// **'Visa, Mastercard, MCB'**
  String get paymentMethodCardSub;

  /// No description provided for @paymentMethodJuice.
  ///
  /// In en, this message translates to:
  /// **'Juice by MCB'**
  String get paymentMethodJuice;

  /// No description provided for @paymentMethodJuiceSub.
  ///
  /// In en, this message translates to:
  /// **'Mobile payment'**
  String get paymentMethodJuiceSub;

  /// No description provided for @paymentMethodCash.
  ///
  /// In en, this message translates to:
  /// **'Cash at pickup'**
  String get paymentMethodCash;

  /// No description provided for @paymentMethodCashSub.
  ///
  /// In en, this message translates to:
  /// **'Pay directly at the shop'**
  String get paymentMethodCashSub;

  /// No description provided for @paymentButton.
  ///
  /// In en, this message translates to:
  /// **'Pay now'**
  String get paymentButton;

  /// No description provided for @paymentSecure.
  ///
  /// In en, this message translates to:
  /// **'Secured payment by BienBon'**
  String get paymentSecure;

  /// No description provided for @confirmationTitle.
  ///
  /// In en, this message translates to:
  /// **'Reservation confirmed!'**
  String get confirmationTitle;

  /// No description provided for @confirmationSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your basket is reserved. Show your QR code at the shop during pickup.'**
  String get confirmationSubtitle;

  /// No description provided for @confirmationReservationNumber.
  ///
  /// In en, this message translates to:
  /// **'Reservation #'**
  String get confirmationReservationNumber;

  /// No description provided for @confirmationViewQR.
  ///
  /// In en, this message translates to:
  /// **'View my QR code'**
  String get confirmationViewQR;

  /// No description provided for @confirmationBackHome.
  ///
  /// In en, this message translates to:
  /// **'Back to home'**
  String get confirmationBackHome;

  /// No description provided for @qrPickupTitle.
  ///
  /// In en, this message translates to:
  /// **'My pickup QR'**
  String get qrPickupTitle;

  /// No description provided for @qrPickupInstruction.
  ///
  /// In en, this message translates to:
  /// **'Show this QR code at the shop when picking up your basket.'**
  String get qrPickupInstruction;

  /// No description provided for @qrPickupPin.
  ///
  /// In en, this message translates to:
  /// **'Backup PIN code'**
  String get qrPickupPin;

  /// No description provided for @qrPickupStoreInfo.
  ///
  /// In en, this message translates to:
  /// **'Pickup details'**
  String get qrPickupStoreInfo;

  /// No description provided for @qrPickupStatus.
  ///
  /// In en, this message translates to:
  /// **'Payment confirmed'**
  String get qrPickupStatus;

  /// No description provided for @ordersTitle.
  ///
  /// In en, this message translates to:
  /// **'My orders'**
  String get ordersTitle;

  /// No description provided for @ordersTabActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get ordersTabActive;

  /// No description provided for @ordersTabHistory.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get ordersTabHistory;

  /// No description provided for @ordersEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No active orders'**
  String get ordersEmptyTitle;

  /// No description provided for @ordersEmptySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Reserve a basket to get started!'**
  String get ordersEmptySubtitle;

  /// No description provided for @ordersEmptyAction.
  ///
  /// In en, this message translates to:
  /// **'Explore baskets'**
  String get ordersEmptyAction;

  /// No description provided for @ordersHistoryEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No history'**
  String get ordersHistoryEmptyTitle;

  /// No description provided for @ordersHistoryEmptySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your past baskets will appear here.'**
  String get ordersHistoryEmptySubtitle;

  /// No description provided for @ordersStatusActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get ordersStatusActive;

  /// No description provided for @ordersStatusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Picked up'**
  String get ordersStatusCompleted;

  /// No description provided for @ordersStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get ordersStatusCancelled;

  /// No description provided for @favoritesTitle.
  ///
  /// In en, this message translates to:
  /// **'My favourites'**
  String get favoritesTitle;

  /// No description provided for @favoritesCount.
  ///
  /// In en, this message translates to:
  /// **'{count} favourite shops'**
  String favoritesCount(int count);

  /// No description provided for @favoritesEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No favourites yet'**
  String get favoritesEmptyTitle;

  /// No description provided for @favoritesEmptySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Add shops to your favourites to find them easily.'**
  String get favoritesEmptySubtitle;

  /// No description provided for @favoritesDiscover.
  ///
  /// In en, this message translates to:
  /// **'Discover shops'**
  String get favoritesDiscover;

  /// No description provided for @profileTitle.
  ///
  /// In en, this message translates to:
  /// **'My profile'**
  String get profileTitle;

  /// No description provided for @profileSectionPreferences.
  ///
  /// In en, this message translates to:
  /// **'Preferences'**
  String get profileSectionPreferences;

  /// No description provided for @profileSectionAccount.
  ///
  /// In en, this message translates to:
  /// **'My account'**
  String get profileSectionAccount;

  /// No description provided for @profileSectionSupport.
  ///
  /// In en, this message translates to:
  /// **'Support'**
  String get profileSectionSupport;

  /// No description provided for @profileFoodPreferences.
  ///
  /// In en, this message translates to:
  /// **'Food preferences'**
  String get profileFoodPreferences;

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

  /// No description provided for @profileReferralCode.
  ///
  /// In en, this message translates to:
  /// **'My referral code'**
  String get profileReferralCode;

  /// No description provided for @profileOrders.
  ///
  /// In en, this message translates to:
  /// **'Order history'**
  String get profileOrders;

  /// No description provided for @profilePaymentMethods.
  ///
  /// In en, this message translates to:
  /// **'Payment methods'**
  String get profilePaymentMethods;

  /// No description provided for @profileHelp.
  ///
  /// In en, this message translates to:
  /// **'Help & FAQ'**
  String get profileHelp;

  /// No description provided for @profileContact.
  ///
  /// In en, this message translates to:
  /// **'Contact support'**
  String get profileContact;

  /// No description provided for @profilePrivacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy policy'**
  String get profilePrivacy;

  /// No description provided for @profileTerms.
  ///
  /// In en, this message translates to:
  /// **'Terms of service'**
  String get profileTerms;

  /// No description provided for @profileLogout.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get profileLogout;

  /// No description provided for @profileLogoutConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get profileLogoutConfirmTitle;

  /// No description provided for @profileLogoutConfirmMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to log out?'**
  String get profileLogoutConfirmMessage;

  /// No description provided for @profileLogoutConfirm.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get profileLogoutConfirm;

  /// No description provided for @commonCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get commonCancel;

  /// No description provided for @commonBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get commonBack;

  /// No description provided for @commonShare.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get commonShare;

  /// No description provided for @commonLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading...'**
  String get commonLoading;

  /// No description provided for @commonError.
  ///
  /// In en, this message translates to:
  /// **'An error occurred'**
  String get commonError;

  /// No description provided for @commonRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get commonRetry;

  /// No description provided for @currencyMUR.
  ///
  /// In en, this message translates to:
  /// **'MUR'**
  String get currencyMUR;

  /// No description provided for @basketRemaining.
  ///
  /// In en, this message translates to:
  /// **'{count} basket(s) remaining'**
  String basketRemaining(int count);

  /// No description provided for @storeRating.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get storeRating;

  /// No description provided for @storeDistance.
  ///
  /// In en, this message translates to:
  /// **'Distance'**
  String get storeDistance;

  /// No description provided for @storeBasketCount.
  ///
  /// In en, this message translates to:
  /// **'{count} basket(s) available'**
  String storeBasketCount(int count);
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
