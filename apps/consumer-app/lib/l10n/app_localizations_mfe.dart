// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Morisyen (`mfe`).
class AppLocalizationsMfe extends AppLocalizations {
  AppLocalizationsMfe([String locale = 'mfe']) : super(locale);

  @override
  String get appName => 'BienBon';

  @override
  String get appTagline => 'Sov panier sipriz !';

  @override
  String get tabHome => 'Lakaz';

  @override
  String get tabExplore => 'Explore';

  @override
  String get tabOrders => 'Komand';

  @override
  String get tabFavorites => 'Favori';

  @override
  String get tabProfile => 'Profil';

  @override
  String get onboardingTitle1 => 'Sov manze';

  @override
  String get onboardingSubtitle1 => 'Pran panier sipriz depi bann komers lokal a pri redwi e kontribye pou redwir gaspiaz manze dan Moris.';

  @override
  String get onboardingTitle2 => 'Pran fasil ek vit';

  @override
  String get onboardingSubtitle2 => 'Rezerv an klik ek montre to kode QR kan to pran to panier. Fasil, rapid, san kontak.';

  @override
  String get onboardingTitle3 => 'Aze pou planet';

  @override
  String get onboardingSubtitle3 => 'Sak panier sove, sa 1,2 kg CO2 ki pa gaspiye. Ansam, protez nou bel Moris!';

  @override
  String get onboardingSkip => 'Pas';

  @override
  String get onboardingNext => 'Swivan';

  @override
  String get onboardingGetStarted => 'Komanse';

  @override
  String get loginTitle => 'Konekte';

  @override
  String get loginEmail => 'Imel';

  @override
  String get loginPassword => 'Mot de pas';

  @override
  String get loginButton => 'Konekte';

  @override
  String get loginNoAccount => 'Pa enn kont ankor?';

  @override
  String get loginRegisterLink => 'Anrezistre';

  @override
  String get loginEmailHint => 'twa@lexamp.com';

  @override
  String get loginPasswordHint => '••••••••';

  @override
  String get loginEmailRequired => 'Rant to imel';

  @override
  String get loginEmailInvalid => 'Imel pa valid';

  @override
  String get loginPasswordRequired => 'Rant to mot de pas';

  @override
  String get registerTitle => 'Kree enn kont';

  @override
  String get registerName => 'Prenom ek nom';

  @override
  String get registerNameHint => 'Marie Dupont';

  @override
  String get registerEmail => 'Imel';

  @override
  String get registerPassword => 'Mot de pas';

  @override
  String get registerConfirmPassword => 'Konfirm mot de pas';

  @override
  String get registerButton => 'Kree mo kont';

  @override
  String get registerAlreadyAccount => 'Deza enn kont?';

  @override
  String get registerLoginLink => 'Konekte';

  @override
  String get homeHeroTitle => 'Sov bann panier sipriz!';

  @override
  String get homeHeroSubtitle => 'Ziska -70% lor invendy lizordi';

  @override
  String get homeNearMeSection => 'Pre ar mwa';

  @override
  String get homeBasketsSection => 'Bann panier dimonn';

  @override
  String get homeSeeAll => 'Get tou';

  @override
  String get exploreTitle => 'Explore';

  @override
  String get exploreSearchHint => 'Rod enn panier ouswa komers...';

  @override
  String get exploreCategoryAll => 'Tou';

  @override
  String get exploreCategoryBakery => 'Boulanzri';

  @override
  String get exploreCategoryRestaurant => 'Restoran';

  @override
  String get exploreCategorySupermarket => 'Sipermarse';

  @override
  String get exploreCategoryCafe => 'Kafe';

  @override
  String exploreResultsCount(int count) {
    return '$count panier trouv';
  }

  @override
  String get exploreNoResults => 'Okenn panier trouv';

  @override
  String get exploreNoResultsSubtitle => 'Esey enn lot resers';

  @override
  String get basketDetailReserveButton => 'Rezerv sa panier-la';

  @override
  String get basketDetailPickupWindow => 'Ler pou pran';

  @override
  String get basketDetailAllergens => 'Bann posib alerzenn';

  @override
  String get basketDetailDescription => 'Deskripsion';

  @override
  String get reservationTitle => 'Rekapitilatif';

  @override
  String get reservationStore => 'Komers';

  @override
  String get reservationAddress => 'Adres';

  @override
  String get reservationPickup => 'Ler pou pran';

  @override
  String get reservationQuantity => 'Kantite';

  @override
  String get reservationOriginalPrice => 'Pri orizinal';

  @override
  String get reservationDiscount => 'Reduksion BienBon';

  @override
  String get reservationTotal => 'Total pou paye';

  @override
  String get reservationConfirmButton => 'Konfirm ek paye';

  @override
  String get reservationCancelButton => 'Anile';

  @override
  String get paymentTitle => 'Peman';

  @override
  String get paymentMethodCard => 'Kart bankee';

  @override
  String get paymentMethodCardSub => 'Visa, Mastercard, MCB';

  @override
  String get paymentMethodJuice => 'Juice par MCB';

  @override
  String get paymentMethodJuiceSub => 'Peman mobil';

  @override
  String get paymentMethodCash => 'Kas kan pran';

  @override
  String get paymentMethodCashSub => 'Paye direk ar komers';

  @override
  String get paymentButton => 'Paye asterla';

  @override
  String get paymentSecure => 'Peman sekiir par BienBon';

  @override
  String get confirmationTitle => 'Rezèrvasion konfirme!';

  @override
  String get confirmationSubtitle => 'To panier rezerve. Montre to kode QR ar komers kan to al pran.';

  @override
  String get confirmationReservationNumber => 'N° rezèrvasion';

  @override
  String get confirmationViewQR => 'Get mo kode QR';

  @override
  String get confirmationBackHome => 'Retourne lakaz';

  @override
  String get qrPickupTitle => 'Mo QR pou pran';

  @override
  String get qrPickupInstruction => 'Montre sa kode QR ar komers kan to al pran to panier.';

  @override
  String get qrPickupPin => 'Kode PIN lezot';

  @override
  String get qrPickupStoreInfo => 'Detay pou pran';

  @override
  String get qrPickupStatus => 'Peman konfirme';

  @override
  String get ordersTitle => 'Mo bann komand';

  @override
  String get ordersTabActive => 'An kor';

  @override
  String get ordersTabHistory => 'Listwar';

  @override
  String get ordersEmptyTitle => 'Okenn komand an kor';

  @override
  String get ordersEmptySubtitle => 'Rezerv enn panier pou koumanse!';

  @override
  String get ordersEmptyAction => 'Explore bann panier';

  @override
  String get ordersHistoryEmptyTitle => 'Okenn listwar';

  @override
  String get ordersHistoryEmptySubtitle => 'To bann panier pase pou paret la.';

  @override
  String get ordersStatusActive => 'An kor';

  @override
  String get ordersStatusCompleted => 'Pran';

  @override
  String get ordersStatusCancelled => 'Anile';

  @override
  String get favoritesTitle => 'Mo bann favori';

  @override
  String favoritesCount(int count) {
    return '$count komers favori';
  }

  @override
  String get favoritesEmptyTitle => 'Okenn favori ankor';

  @override
  String get favoritesEmptySubtitle => 'Azout bann komers dan to favori pou trouv zot fasil.';

  @override
  String get favoritesDiscover => 'Dekouver bann komers';

  @override
  String get profileTitle => 'Mo profil';

  @override
  String get profileSectionPreferences => 'Preferans';

  @override
  String get profileSectionAccount => 'Mo kont';

  @override
  String get profileSectionSupport => 'Sipor';

  @override
  String get profileFoodPreferences => 'Preferans manze';

  @override
  String get profileNotifications => 'Notifikasion';

  @override
  String get profileLanguage => 'Lang';

  @override
  String get profileReferralCode => 'Mo kode parainaz';

  @override
  String get profileOrders => 'Listwar komand';

  @override
  String get profilePaymentMethods => 'Mwayen peman';

  @override
  String get profileHelp => 'Ed ek FAQ';

  @override
  String get profileContact => 'Kontakte sipor';

  @override
  String get profilePrivacy => 'Politique konfidansialite';

  @override
  String get profileTerms => 'Kondision itilizasion';

  @override
  String get profileLogout => 'Dekonekte';

  @override
  String get profileLogoutConfirmTitle => 'Dekonekte';

  @override
  String get profileLogoutConfirmMessage => 'Eski to sir to anvi dekonekte?';

  @override
  String get profileLogoutConfirm => 'Dekonekte';

  @override
  String get commonCancel => 'Anile';

  @override
  String get commonBack => 'Retourne';

  @override
  String get commonShare => 'Partaz';

  @override
  String get commonLoading => 'Sarz...';

  @override
  String get commonError => 'Enn erer finn arive';

  @override
  String get commonRetry => 'Reesay';

  @override
  String get currencyMUR => 'MUR';

  @override
  String basketRemaining(int count) {
    return '$count panier reste';
  }

  @override
  String get storeRating => 'Not';

  @override
  String get storeDistance => 'Distans';

  @override
  String storeBasketCount(int count) {
    return '$count panier disponib';
  }
}
