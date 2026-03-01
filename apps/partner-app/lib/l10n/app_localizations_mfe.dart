// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Morisyen (`mfe`).
class AppLocalizationsMfe extends AppLocalizations {
  AppLocalizationsMfe([String locale = 'mfe']) : super(locale);

  @override
  String get appTitle => 'BienBon Partner';

  @override
  String get loginTitle => 'BienBon Partner';

  @override
  String get loginSubtitle => 'Gere to panye, valid to retra ek swiv to reveni.';

  @override
  String get loginEmailLabel => 'Email partenaire';

  @override
  String get loginPasswordLabel => 'Mot de passe';

  @override
  String get loginButton => 'Konekte';

  @override
  String get loginForgotPassword => 'Ou finn bliye to mot de passe ?';

  @override
  String get loginNoAccount => 'Ou pa ena enn kont partenaire?\nKontakte nou: partenaires@bienbon.mu';

  @override
  String get dashboardTitle => 'Tablo de bor';

  @override
  String dashboardGreeting(String name) {
    return 'Bonzour, $name';
  }

  @override
  String get dashboardSubtitle => 'Statistik zordi';

  @override
  String get dashboardBasketsPublished => 'Panye pibliye';

  @override
  String get dashboardReservations => 'Rezervasion';

  @override
  String get dashboardPickupsValidated => 'Retra valide';

  @override
  String get dashboardRevenue => 'Reveni';

  @override
  String get dashboardWeeklySales => 'Lavant semenn-la';

  @override
  String get dashboardQuickActions => 'Aksion rapid';

  @override
  String get dashboardCreateBasket => 'Kree enn panye';

  @override
  String get dashboardScanPickup => 'Scanner enn retra';

  @override
  String get dashboardMyStores => 'Mo bazar';

  @override
  String get dashboardRecentActivity => 'Aktivite resan';

  @override
  String get basketsTitle => 'Mo panye';

  @override
  String get basketCreate => 'Kree enn panye';

  @override
  String get basketEdit => 'Modifie';

  @override
  String get basketPublish => 'Pibliye';

  @override
  String get basketUnpublish => 'Retir';

  @override
  String get basketStock => 'Stock';

  @override
  String get basketOriginalPrice => 'Pri orizinal';

  @override
  String get basketDiscountedPrice => 'Pri redwi';

  @override
  String get basketCategory => 'Kategori';

  @override
  String get basketPickupTime => 'Ler retra';

  @override
  String get basketStatusDraft => 'Brouyion';

  @override
  String get basketStatusPublished => 'Pibliye';

  @override
  String get basketStatusSoldOut => 'Fini vann';

  @override
  String basketReservationsCount(int count) {
    return '$count rezervasion';
  }

  @override
  String get pickupTitle => 'Valid enn retra';

  @override
  String get pickupScanQr => 'Scanner QR';

  @override
  String get pickupEnterPin => 'Rant PIN';

  @override
  String get pickupValidate => 'Valid retra';

  @override
  String get pickupConfirmed => 'Retra konfirme !';

  @override
  String get pickupSuccess => 'Retra finn valide ek suxe.';

  @override
  String get pickupScanAnother => 'Scanner enn lot retra';

  @override
  String get pickupPinHint => '0000';

  @override
  String get pickupPinInstruction => 'Klient bizin donn ou so kode PIN 4 shif.';

  @override
  String get reservationsTitle => 'Rezervasion';

  @override
  String get reservationDetail => 'Detay rezervasion';

  @override
  String get reservationStatusConfirmed => 'Konfirme';

  @override
  String get reservationStatusReady => 'Pre';

  @override
  String get reservationStatusPickedUp => 'Retire';

  @override
  String get reservationStatusNoShow => 'Absan';

  @override
  String get reservationCode => 'Kode retra';

  @override
  String get reservationValidate => 'Valid retra';

  @override
  String get revenueTitle => 'Mo reveni';

  @override
  String get revenueCurrent => 'Reveni brut';

  @override
  String get revenueCommission => 'Komisyon BienBon (25%)';

  @override
  String get revenueNet => 'Net partenaire';

  @override
  String get revenueHistory => 'Listwar reversement';

  @override
  String get revenueThisMonth => 'Mwa-la';

  @override
  String get revenuePaid => 'Peye';

  @override
  String get profileTitle => 'Profil & Parametre';

  @override
  String get profileMyStore => 'Mo bazar';

  @override
  String get profileHours => 'Ler bazar';

  @override
  String get profileMyStores => 'Mo bazar';

  @override
  String get profilePayouts => 'Reversement';

  @override
  String get profileNotifications => 'Notifikasion';

  @override
  String get profileLanguage => 'Lang';

  @override
  String get profileHelp => 'Led & Sipor';

  @override
  String get profileTerms => 'Kondision partenaire';

  @override
  String get profilePrivacy => 'Politik konfidansyalite';

  @override
  String get profileLogout => 'Dekonekte';

  @override
  String get profileLogoutConfirm => 'Ou sir ou ole dekonekte ?';

  @override
  String get profileVerified => 'Partenaire verifie';

  @override
  String get storeActive => 'Aktif';

  @override
  String get storeSuspended => 'Sipande';

  @override
  String get storePending => 'An atant';

  @override
  String get storeDetailTitle => 'Detay bazar';

  @override
  String get commonSave => 'Anrezistr';

  @override
  String get commonCancel => 'Anile';

  @override
  String get commonConfirm => 'Konfirm';

  @override
  String get commonClose => 'Ferm';

  @override
  String get commonLoading => 'Pe charge...';

  @override
  String get commonRequired => 'Obligatwar';

  @override
  String get commonError => 'Enn erer finn arive';

  @override
  String get commonSuccess => 'Suxe';
}
