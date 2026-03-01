// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get appTitle => 'BienBon Partner';

  @override
  String get loginTitle => 'BienBon Partner';

  @override
  String get loginSubtitle => 'Gerez vos paniers, validez les retraits et suivez vos revenus.';

  @override
  String get loginEmailLabel => 'Email partenaire';

  @override
  String get loginPasswordLabel => 'Mot de passe';

  @override
  String get loginButton => 'Se connecter';

  @override
  String get loginForgotPassword => 'Mot de passe oublie ?';

  @override
  String get loginNoAccount => 'Vous n\'avez pas encore de compte partenaire ?\nContactez-nous sur partenaires@bienbon.mu';

  @override
  String get dashboardTitle => 'Tableau de bord';

  @override
  String dashboardGreeting(String name) {
    return 'Bonjour, $name';
  }

  @override
  String get dashboardSubtitle => 'Statistiques du jour';

  @override
  String get dashboardBasketsPublished => 'Paniers publies';

  @override
  String get dashboardReservations => 'Reservations';

  @override
  String get dashboardPickupsValidated => 'Retraits valides';

  @override
  String get dashboardRevenue => 'Chiffre d\'affaires';

  @override
  String get dashboardWeeklySales => 'Ventes cette semaine';

  @override
  String get dashboardQuickActions => 'Actions rapides';

  @override
  String get dashboardCreateBasket => 'Creer un panier';

  @override
  String get dashboardScanPickup => 'Scanner un retrait';

  @override
  String get dashboardMyStores => 'Mes commerces';

  @override
  String get dashboardRecentActivity => 'Activite recente';

  @override
  String get basketsTitle => 'Mes paniers';

  @override
  String get basketCreate => 'Creer un panier';

  @override
  String get basketEdit => 'Modifier';

  @override
  String get basketPublish => 'Publier';

  @override
  String get basketUnpublish => 'Retirer';

  @override
  String get basketStock => 'Stock';

  @override
  String get basketOriginalPrice => 'Prix original';

  @override
  String get basketDiscountedPrice => 'Prix reduit';

  @override
  String get basketCategory => 'Categorie';

  @override
  String get basketPickupTime => 'Heure de retrait';

  @override
  String get basketStatusDraft => 'Brouillon';

  @override
  String get basketStatusPublished => 'Publie';

  @override
  String get basketStatusSoldOut => 'Epuise';

  @override
  String basketReservationsCount(int count) {
    return '$count reservation(s)';
  }

  @override
  String get pickupTitle => 'Valider un retrait';

  @override
  String get pickupScanQr => 'Scanner QR';

  @override
  String get pickupEnterPin => 'Saisir PIN';

  @override
  String get pickupValidate => 'Valider le retrait';

  @override
  String get pickupConfirmed => 'Retrait confirme !';

  @override
  String get pickupSuccess => 'Le retrait a ete valide avec succes.';

  @override
  String get pickupScanAnother => 'Scanner un autre retrait';

  @override
  String get pickupPinHint => '0000';

  @override
  String get pickupPinInstruction => 'Le client doit vous communiquer son code PIN a 4 chiffres.';

  @override
  String get reservationsTitle => 'Reservations';

  @override
  String get reservationDetail => 'Detail de la reservation';

  @override
  String get reservationStatusConfirmed => 'Confirme';

  @override
  String get reservationStatusReady => 'Pret';

  @override
  String get reservationStatusPickedUp => 'Retire';

  @override
  String get reservationStatusNoShow => 'Absent';

  @override
  String get reservationCode => 'Code de retrait';

  @override
  String get reservationValidate => 'Valider le retrait';

  @override
  String get revenueTitle => 'Mes reversements';

  @override
  String get revenueCurrent => 'Chiffre d\'affaires brut';

  @override
  String get revenueCommission => 'Commission BienBon (25%)';

  @override
  String get revenueNet => 'Net partenaire';

  @override
  String get revenueHistory => 'Historique des reversements';

  @override
  String get revenueThisMonth => 'Ce mois-ci';

  @override
  String get revenuePaid => 'Vire';

  @override
  String get profileTitle => 'Profil & Parametres';

  @override
  String get profileMyStore => 'Mon commerce';

  @override
  String get profileHours => 'Horaires du commerce';

  @override
  String get profileMyStores => 'Mes commerces';

  @override
  String get profilePayouts => 'Reversements';

  @override
  String get profileNotifications => 'Notifications';

  @override
  String get profileLanguage => 'Langue';

  @override
  String get profileHelp => 'Aide & Support';

  @override
  String get profileTerms => 'Conditions partenaires';

  @override
  String get profilePrivacy => 'Politique de confidentialite';

  @override
  String get profileLogout => 'Se deconnecter';

  @override
  String get profileLogoutConfirm => 'Etes-vous sur de vouloir vous deconnecter ?';

  @override
  String get profileVerified => 'Partenaire verifie';

  @override
  String get storeActive => 'Actif';

  @override
  String get storeSuspended => 'Suspendu';

  @override
  String get storePending => 'En attente';

  @override
  String get storeDetailTitle => 'Detail du commerce';

  @override
  String get commonSave => 'Enregistrer';

  @override
  String get commonCancel => 'Annuler';

  @override
  String get commonConfirm => 'Confirmer';

  @override
  String get commonClose => 'Fermer';

  @override
  String get commonLoading => 'Chargement...';

  @override
  String get commonRequired => 'Requis';

  @override
  String get commonError => 'Une erreur est survenue';

  @override
  String get commonSuccess => 'Succes';
}
