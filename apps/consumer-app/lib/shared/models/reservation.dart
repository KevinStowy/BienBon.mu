/// Reservation status following the state machine from ADR-017.
enum ReservationStatus {
  reserved,
  slotActive,
  pickedUp,
  noShow,
  cancelledByConsumer,
  cancelledByPartner,
}

/// Reservation model.
class Reservation {
  const Reservation({
    required this.id,
    required this.basketId,
    required this.basketTitle,
    required this.storeId,
    required this.storeName,
    required this.storeAddress,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    required this.pickupDate,
    required this.pickupStart,
    required this.pickupEnd,
    required this.status,
    required this.createdAt,
    this.qrCodeData,
    this.pinCode,
    this.storeLatitude,
    this.storeLongitude,
    this.storeImageUrl,
    this.refundStatus,
    this.refundAmount,
    this.hasReview = false,
    this.hasClaim = false,
  });

  final String id;
  final String basketId;
  final String basketTitle;
  final String storeId;
  final String storeName;
  final String storeAddress;
  final int quantity;
  final double unitPrice;
  final double totalPrice;
  final DateTime pickupDate;
  final String pickupStart;
  final String pickupEnd;
  final ReservationStatus status;
  final DateTime createdAt;
  final String? qrCodeData;
  final String? pinCode;
  final double? storeLatitude;
  final double? storeLongitude;
  final String? storeImageUrl;
  final String? refundStatus;
  final double? refundAmount;
  final bool hasReview;
  final bool hasClaim;

  String get pickupWindow => '$pickupStart - $pickupEnd';

  bool get isActive =>
      status == ReservationStatus.reserved ||
      status == ReservationStatus.slotActive;

  bool get canCancel => status == ReservationStatus.reserved;

  bool get canRate =>
      status == ReservationStatus.pickedUp && !hasReview;

  bool get canClaim =>
      status == ReservationStatus.pickedUp && !hasClaim;

  factory Reservation.fromJson(Map<String, dynamic> json) {
    return Reservation(
      id: json['id'] as String,
      basketId: json['basketId'] as String,
      basketTitle: json['basketTitle'] as String? ?? 'Panier Surprise',
      storeId: json['storeId'] as String,
      storeName: json['storeName'] as String? ?? '',
      storeAddress: json['storeAddress'] as String? ?? '',
      quantity: json['quantity'] as int? ?? 1,
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
      totalPrice: (json['totalPrice'] as num?)?.toDouble() ?? 0,
      pickupDate: DateTime.parse(json['pickupDate'] as String),
      pickupStart: json['pickupStart'] as String,
      pickupEnd: json['pickupEnd'] as String,
      status: _parseStatus(json['status'] as String?),
      createdAt: DateTime.parse(
          json['createdAt'] as String? ?? DateTime.now().toIso8601String()),
      qrCodeData: json['qrCodeData'] as String?,
      pinCode: json['pinCode'] as String?,
      storeLatitude: (json['storeLatitude'] as num?)?.toDouble(),
      storeLongitude: (json['storeLongitude'] as num?)?.toDouble(),
      storeImageUrl: json['storeImageUrl'] as String?,
      refundStatus: json['refundStatus'] as String?,
      refundAmount: (json['refundAmount'] as num?)?.toDouble(),
      hasReview: json['hasReview'] as bool? ?? false,
      hasClaim: json['hasClaim'] as bool? ?? false,
    );
  }

  static ReservationStatus _parseStatus(String? status) {
    return switch (status) {
      'reserved' => ReservationStatus.reserved,
      'slot_active' => ReservationStatus.slotActive,
      'picked_up' => ReservationStatus.pickedUp,
      'no_show' => ReservationStatus.noShow,
      'cancelled_by_consumer' => ReservationStatus.cancelledByConsumer,
      'cancelled_by_partner' => ReservationStatus.cancelledByPartner,
      _ => ReservationStatus.reserved,
    };
  }
}
