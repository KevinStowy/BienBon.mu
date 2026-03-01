// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get appName => 'BienBon';

  @override
  String get appTagline => 'Sauvez des paniers surprise !';

  @override
  String get tabHome => 'Accueil';

  @override
  String get tabExplore => 'Explorer';

  @override
  String get tabOrders => 'Commandes';

  @override
  String get tabFavorites => 'Favoris';

  @override
  String get tabProfile => 'Profil';

  @override
  String get onboardingTitle1 => 'Sauvez des paniers';

  @override
  String get onboardingSubtitle1 => 'Recuperez des paniers surprise de commerces locaux a prix reduit et contribuez a reduire le gaspillage alimentaire a Maurice.';

  @override
  String get onboardingTitle2 => 'Retrait simple et rapide';

  @override
  String get onboardingSubtitle2 => 'Reservez en quelques clics et presentez votre QR code lors du retrait. Simple, rapide, sans contact.';

  @override
  String get onboardingTitle3 => 'Agissez pour la planete';

  @override
  String get onboardingSubtitle3 => 'Chaque panier sauve, c\'est 1,2 kg de CO2 evite. Ensemble, protegeon notre belle ile Maurice !';

  @override
  String get onboardingSkip => 'Passer';

  @override
  String get onboardingNext => 'Suivant';

  @override
  String get onboardingGetStarted => 'Commencer';

  @override
  String get loginTitle => 'Connexion';

  @override
  String get loginEmail => 'Email';

  @override
  String get loginPassword => 'Mot de passe';

  @override
  String get loginButton => 'Se connecter';

  @override
  String get loginNoAccount => 'Pas encore de compte ?';

  @override
  String get loginRegisterLink => 'S\'inscrire';

  @override
  String get loginEmailHint => 'vous@exemple.com';

  @override
  String get loginPasswordHint => '••••••••';

  @override
  String get loginEmailRequired => 'Veuillez saisir votre email';

  @override
  String get loginEmailInvalid => 'Email invalide';

  @override
  String get loginPasswordRequired => 'Veuillez saisir votre mot de passe';

  @override
  String get registerTitle => 'Creer un compte';

  @override
  String get registerName => 'Prenom et nom';

  @override
  String get registerNameHint => 'Marie Dupont';

  @override
  String get registerEmail => 'Email';

  @override
  String get registerPassword => 'Mot de passe';

  @override
  String get registerConfirmPassword => 'Confirmer le mot de passe';

  @override
  String get registerButton => 'Creer mon compte';

  @override
  String get registerAlreadyAccount => 'Deja un compte ?';

  @override
  String get registerLoginLink => 'Se connecter';

  @override
  String get homeHeroTitle => 'Sauvez des paniers surprise !';

  @override
  String get homeHeroSubtitle => 'Jusqu\'a -70% sur les invendus du jour';

  @override
  String get homeNearMeSection => 'Pres de chez moi';

  @override
  String get homeBasketsSection => 'Paniers du moment';

  @override
  String get homeSeeAll => 'Voir tout';

  @override
  String get exploreTitle => 'Explorer';

  @override
  String get exploreSearchHint => 'Rechercher un panier ou un commerce...';

  @override
  String get exploreCategoryAll => 'Tous';

  @override
  String get exploreCategoryBakery => 'Boulangerie';

  @override
  String get exploreCategoryRestaurant => 'Restaurant';

  @override
  String get exploreCategorySupermarket => 'Supermarche';

  @override
  String get exploreCategoryCafe => 'Cafe';

  @override
  String exploreResultsCount(int count) {
    return '$count paniers trouves';
  }

  @override
  String get exploreNoResults => 'Aucun panier trouve';

  @override
  String get exploreNoResultsSubtitle => 'Essayez une autre recherche';

  @override
  String get basketDetailReserveButton => 'Reserver ce panier';

  @override
  String get basketDetailPickupWindow => 'Creneau de retrait';

  @override
  String get basketDetailAllergens => 'Allergenes possibles';

  @override
  String get basketDetailDescription => 'Description';

  @override
  String get reservationTitle => 'Recapitulatif';

  @override
  String get reservationStore => 'Commerce';

  @override
  String get reservationAddress => 'Adresse';

  @override
  String get reservationPickup => 'Creneau de retrait';

  @override
  String get reservationQuantity => 'Quantite';

  @override
  String get reservationOriginalPrice => 'Prix original';

  @override
  String get reservationDiscount => 'Remise BienBon';

  @override
  String get reservationTotal => 'Total a payer';

  @override
  String get reservationConfirmButton => 'Confirmer et payer';

  @override
  String get reservationCancelButton => 'Annuler';

  @override
  String get paymentTitle => 'Paiement';

  @override
  String get paymentMethodCard => 'Carte bancaire';

  @override
  String get paymentMethodCardSub => 'Visa, Mastercard, MCB';

  @override
  String get paymentMethodJuice => 'Juice by MCB';

  @override
  String get paymentMethodJuiceSub => 'Paiement mobile';

  @override
  String get paymentMethodCash => 'Especes au retrait';

  @override
  String get paymentMethodCashSub => 'Payer directement au commerce';

  @override
  String get paymentButton => 'Payer maintenant';

  @override
  String get paymentSecure => 'Paiement securise par BienBon';

  @override
  String get confirmationTitle => 'Reservation confirmee !';

  @override
  String get confirmationSubtitle => 'Votre panier est reserve. Presentez votre QR code au commerce lors du retrait.';

  @override
  String get confirmationReservationNumber => 'N° de reservation';

  @override
  String get confirmationViewQR => 'Voir mon QR code';

  @override
  String get confirmationBackHome => 'Retour a l\'accueil';

  @override
  String get qrPickupTitle => 'Mon QR de retrait';

  @override
  String get qrPickupInstruction => 'Presentez ce QR code au commerce lors du retrait de votre panier.';

  @override
  String get qrPickupPin => 'Code PIN de secours';

  @override
  String get qrPickupStoreInfo => 'Details du retrait';

  @override
  String get qrPickupStatus => 'Paiement confirme';

  @override
  String get ordersTitle => 'Mes commandes';

  @override
  String get ordersTabActive => 'En cours';

  @override
  String get ordersTabHistory => 'Historique';

  @override
  String get ordersEmptyTitle => 'Aucune commande en cours';

  @override
  String get ordersEmptySubtitle => 'Reservez un panier pour commencer !';

  @override
  String get ordersEmptyAction => 'Explorer les paniers';

  @override
  String get ordersHistoryEmptyTitle => 'Aucun historique';

  @override
  String get ordersHistoryEmptySubtitle => 'Vos paniers passes apparaitront ici.';

  @override
  String get ordersStatusActive => 'En cours';

  @override
  String get ordersStatusCompleted => 'Retire';

  @override
  String get ordersStatusCancelled => 'Annule';

  @override
  String get favoritesTitle => 'Mes favoris';

  @override
  String favoritesCount(int count) {
    return '$count commerces favoris';
  }

  @override
  String get favoritesEmptyTitle => 'Aucun favori';

  @override
  String get favoritesEmptySubtitle => 'Ajoutez des commerces a vos favoris pour les retrouver facilement.';

  @override
  String get favoritesDiscover => 'Decouvrir les commerces';

  @override
  String get profileTitle => 'Mon profil';

  @override
  String get profileSectionPreferences => 'Preferences';

  @override
  String get profileSectionAccount => 'Mon compte';

  @override
  String get profileSectionSupport => 'Support';

  @override
  String get profileFoodPreferences => 'Preferences alimentaires';

  @override
  String get profileNotifications => 'Notifications';

  @override
  String get profileLanguage => 'Langue';

  @override
  String get profileReferralCode => 'Mon code parrainage';

  @override
  String get profileOrders => 'Historique des commandes';

  @override
  String get profilePaymentMethods => 'Moyens de paiement';

  @override
  String get profileHelp => 'Aide et FAQ';

  @override
  String get profileContact => 'Contacter le support';

  @override
  String get profilePrivacy => 'Politique de confidentialite';

  @override
  String get profileTerms => 'Conditions d\'utilisation';

  @override
  String get profileLogout => 'Deconnexion';

  @override
  String get profileLogoutConfirmTitle => 'Deconnexion';

  @override
  String get profileLogoutConfirmMessage => 'Etes-vous sur de vouloir vous deconnecter ?';

  @override
  String get profileLogoutConfirm => 'Deconnecter';

  @override
  String get commonCancel => 'Annuler';

  @override
  String get commonBack => 'Retour';

  @override
  String get commonShare => 'Partager';

  @override
  String get commonLoading => 'Chargement...';

  @override
  String get commonError => 'Une erreur est survenue';

  @override
  String get commonRetry => 'Reessayer';

  @override
  String get currencyMUR => 'MUR';

  @override
  String basketRemaining(int count) {
    return '$count panier(s) restant(s)';
  }

  @override
  String get storeRating => 'Note';

  @override
  String get storeDistance => 'Distance';

  @override
  String storeBasketCount(int count) {
    return '$count panier(s) disponible(s)';
  }
}
