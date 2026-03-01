// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'BienBon';

  @override
  String get appTagline => 'Save surprise baskets!';

  @override
  String get tabHome => 'Home';

  @override
  String get tabExplore => 'Explore';

  @override
  String get tabOrders => 'Orders';

  @override
  String get tabFavorites => 'Favourites';

  @override
  String get tabProfile => 'Profile';

  @override
  String get onboardingTitle1 => 'Save baskets';

  @override
  String get onboardingSubtitle1 => 'Pick up surprise baskets from local shops at a reduced price and help reduce food waste in Mauritius.';

  @override
  String get onboardingTitle2 => 'Simple & quick pickup';

  @override
  String get onboardingSubtitle2 => 'Book in a few taps and show your QR code at pickup. Simple, fast, contactless.';

  @override
  String get onboardingTitle3 => 'Act for the planet';

  @override
  String get onboardingSubtitle3 => 'Every saved basket avoids 1.2 kg of CO2. Together, let\'s protect our beautiful island!';

  @override
  String get onboardingSkip => 'Skip';

  @override
  String get onboardingNext => 'Next';

  @override
  String get onboardingGetStarted => 'Get started';

  @override
  String get loginTitle => 'Log in';

  @override
  String get loginEmail => 'Email';

  @override
  String get loginPassword => 'Password';

  @override
  String get loginButton => 'Log in';

  @override
  String get loginNoAccount => 'No account yet?';

  @override
  String get loginRegisterLink => 'Sign up';

  @override
  String get loginEmailHint => 'you@example.com';

  @override
  String get loginPasswordHint => '••••••••';

  @override
  String get loginEmailRequired => 'Please enter your email';

  @override
  String get loginEmailInvalid => 'Invalid email';

  @override
  String get loginPasswordRequired => 'Please enter your password';

  @override
  String get registerTitle => 'Create an account';

  @override
  String get registerName => 'First and last name';

  @override
  String get registerNameHint => 'Marie Dupont';

  @override
  String get registerEmail => 'Email';

  @override
  String get registerPassword => 'Password';

  @override
  String get registerConfirmPassword => 'Confirm password';

  @override
  String get registerButton => 'Create my account';

  @override
  String get registerAlreadyAccount => 'Already have an account?';

  @override
  String get registerLoginLink => 'Log in';

  @override
  String get homeHeroTitle => 'Save surprise baskets!';

  @override
  String get homeHeroSubtitle => 'Up to -70% off today\'s unsold items';

  @override
  String get homeNearMeSection => 'Near me';

  @override
  String get homeBasketsSection => 'Baskets of the moment';

  @override
  String get homeSeeAll => 'See all';

  @override
  String get exploreTitle => 'Explore';

  @override
  String get exploreSearchHint => 'Search for a basket or shop...';

  @override
  String get exploreCategoryAll => 'All';

  @override
  String get exploreCategoryBakery => 'Bakery';

  @override
  String get exploreCategoryRestaurant => 'Restaurant';

  @override
  String get exploreCategorySupermarket => 'Supermarket';

  @override
  String get exploreCategoryCafe => 'Cafe';

  @override
  String exploreResultsCount(int count) {
    return '$count baskets found';
  }

  @override
  String get exploreNoResults => 'No baskets found';

  @override
  String get exploreNoResultsSubtitle => 'Try a different search';

  @override
  String get basketDetailReserveButton => 'Reserve this basket';

  @override
  String get basketDetailPickupWindow => 'Pickup window';

  @override
  String get basketDetailAllergens => 'Possible allergens';

  @override
  String get basketDetailDescription => 'Description';

  @override
  String get reservationTitle => 'Summary';

  @override
  String get reservationStore => 'Shop';

  @override
  String get reservationAddress => 'Address';

  @override
  String get reservationPickup => 'Pickup window';

  @override
  String get reservationQuantity => 'Quantity';

  @override
  String get reservationOriginalPrice => 'Original price';

  @override
  String get reservationDiscount => 'BienBon discount';

  @override
  String get reservationTotal => 'Total to pay';

  @override
  String get reservationConfirmButton => 'Confirm and pay';

  @override
  String get reservationCancelButton => 'Cancel';

  @override
  String get paymentTitle => 'Payment';

  @override
  String get paymentMethodCard => 'Credit card';

  @override
  String get paymentMethodCardSub => 'Visa, Mastercard, MCB';

  @override
  String get paymentMethodJuice => 'Juice by MCB';

  @override
  String get paymentMethodJuiceSub => 'Mobile payment';

  @override
  String get paymentMethodCash => 'Cash at pickup';

  @override
  String get paymentMethodCashSub => 'Pay directly at the shop';

  @override
  String get paymentButton => 'Pay now';

  @override
  String get paymentSecure => 'Secured payment by BienBon';

  @override
  String get confirmationTitle => 'Reservation confirmed!';

  @override
  String get confirmationSubtitle => 'Your basket is reserved. Show your QR code at the shop during pickup.';

  @override
  String get confirmationReservationNumber => 'Reservation #';

  @override
  String get confirmationViewQR => 'View my QR code';

  @override
  String get confirmationBackHome => 'Back to home';

  @override
  String get qrPickupTitle => 'My pickup QR';

  @override
  String get qrPickupInstruction => 'Show this QR code at the shop when picking up your basket.';

  @override
  String get qrPickupPin => 'Backup PIN code';

  @override
  String get qrPickupStoreInfo => 'Pickup details';

  @override
  String get qrPickupStatus => 'Payment confirmed';

  @override
  String get ordersTitle => 'My orders';

  @override
  String get ordersTabActive => 'Active';

  @override
  String get ordersTabHistory => 'History';

  @override
  String get ordersEmptyTitle => 'No active orders';

  @override
  String get ordersEmptySubtitle => 'Reserve a basket to get started!';

  @override
  String get ordersEmptyAction => 'Explore baskets';

  @override
  String get ordersHistoryEmptyTitle => 'No history';

  @override
  String get ordersHistoryEmptySubtitle => 'Your past baskets will appear here.';

  @override
  String get ordersStatusActive => 'Active';

  @override
  String get ordersStatusCompleted => 'Picked up';

  @override
  String get ordersStatusCancelled => 'Cancelled';

  @override
  String get favoritesTitle => 'My favourites';

  @override
  String favoritesCount(int count) {
    return '$count favourite shops';
  }

  @override
  String get favoritesEmptyTitle => 'No favourites yet';

  @override
  String get favoritesEmptySubtitle => 'Add shops to your favourites to find them easily.';

  @override
  String get favoritesDiscover => 'Discover shops';

  @override
  String get profileTitle => 'My profile';

  @override
  String get profileSectionPreferences => 'Preferences';

  @override
  String get profileSectionAccount => 'My account';

  @override
  String get profileSectionSupport => 'Support';

  @override
  String get profileFoodPreferences => 'Food preferences';

  @override
  String get profileNotifications => 'Notifications';

  @override
  String get profileLanguage => 'Language';

  @override
  String get profileReferralCode => 'My referral code';

  @override
  String get profileOrders => 'Order history';

  @override
  String get profilePaymentMethods => 'Payment methods';

  @override
  String get profileHelp => 'Help & FAQ';

  @override
  String get profileContact => 'Contact support';

  @override
  String get profilePrivacy => 'Privacy policy';

  @override
  String get profileTerms => 'Terms of service';

  @override
  String get profileLogout => 'Log out';

  @override
  String get profileLogoutConfirmTitle => 'Log out';

  @override
  String get profileLogoutConfirmMessage => 'Are you sure you want to log out?';

  @override
  String get profileLogoutConfirm => 'Log out';

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonBack => 'Back';

  @override
  String get commonShare => 'Share';

  @override
  String get commonLoading => 'Loading...';

  @override
  String get commonError => 'An error occurred';

  @override
  String get commonRetry => 'Retry';

  @override
  String get currencyMUR => 'MUR';

  @override
  String basketRemaining(int count) {
    return '$count basket(s) remaining';
  }

  @override
  String get storeRating => 'Rating';

  @override
  String get storeDistance => 'Distance';

  @override
  String storeBasketCount(int count) {
    return '$count basket(s) available';
  }
}
