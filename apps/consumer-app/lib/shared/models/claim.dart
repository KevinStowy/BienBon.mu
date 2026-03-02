/// Claim status (US-C047/48/49).
enum ClaimStatus {
  open,
  inProgress,
  resolved,
}

/// Claim resolution types.
enum ClaimResolution {
  fullRefund,
  partialRefund,
  rejected,
}

/// Consumer claim model.
class Claim {
  const Claim({
    required this.id,
    required this.reservationId,
    required this.reason,
    required this.description,
    required this.status,
    required this.createdAt,
    this.photoUrls = const [],
    this.resolution,
    this.adminComment,
    this.refundAmount,
    this.resolvedAt,
    this.storeName,
    this.basketTitle,
  });

  final String id;
  final String reservationId;
  final String reason;
  final String description;
  final ClaimStatus status;
  final DateTime createdAt;
  final List<String> photoUrls;
  final ClaimResolution? resolution;
  final String? adminComment;
  final double? refundAmount;
  final DateTime? resolvedAt;
  final String? storeName;
  final String? basketTitle;

  factory Claim.fromJson(Map<String, dynamic> json) {
    return Claim(
      id: json['id'] as String,
      reservationId: json['reservationId'] as String,
      reason: json['reason'] as String,
      description: json['description'] as String,
      status: _parseStatus(json['status'] as String?),
      createdAt: DateTime.parse(json['createdAt'] as String),
      photoUrls: (json['photoUrls'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      resolution: _parseResolution(json['resolution'] as String?),
      adminComment: json['adminComment'] as String?,
      refundAmount: (json['refundAmount'] as num?)?.toDouble(),
      resolvedAt: json['resolvedAt'] != null
          ? DateTime.parse(json['resolvedAt'] as String)
          : null,
      storeName: json['storeName'] as String?,
      basketTitle: json['basketTitle'] as String?,
    );
  }

  static ClaimStatus _parseStatus(String? status) {
    return switch (status) {
      'open' => ClaimStatus.open,
      'in_progress' => ClaimStatus.inProgress,
      'resolved' => ClaimStatus.resolved,
      _ => ClaimStatus.open,
    };
  }

  static ClaimResolution? _parseResolution(String? resolution) {
    return switch (resolution) {
      'full_refund' => ClaimResolution.fullRefund,
      'partial_refund' => ClaimResolution.partialRefund,
      'rejected' => ClaimResolution.rejected,
      _ => null,
    };
  }
}

/// Predefined claim reasons (US-C047).
abstract final class ClaimReasons {
  static const List<String> all = [
    'Contenu du panier non conforme (quantite insuffisante, qualite mediocre, articles manquants)',
    'Probleme d\'hygiene ou de fraicheur',
    'Commerce ferme au moment du retrait',
    'Creneau de retrait non respecte par le partenaire',
    'Erreur de paiement / double prelevement',
    'Probleme technique BienBon (bug app, erreur affichage)',
    'Comportement inapproprie du partenaire',
    'Autre',
  ];
}
