/// Surprise basket model.
class Basket {
  const Basket({
    required this.id,
    required this.storeId,
    required this.storeName,
    required this.title,
    this.description,
    required this.originalPrice,
    required this.discountedPrice,
    required this.pickupDate,
    required this.pickupStart,
    required this.pickupEnd,
    required this.remaining,
    this.imageUrl,
    this.storeImageUrl,
    this.dietaryTags = const [],
    this.categoryName,
    this.storeLatitude,
    this.storeLongitude,
    this.storeAddress,
    this.storeRating,
    this.storeReviewCount,
  });

  final String id;
  final String storeId;
  final String storeName;
  final String title;
  final String? description;
  final double originalPrice;
  final double discountedPrice;
  final DateTime pickupDate;
  final String pickupStart;
  final String pickupEnd;
  final int remaining;
  final String? imageUrl;
  final String? storeImageUrl;
  final List<String> dietaryTags;
  final String? categoryName;
  final double? storeLatitude;
  final double? storeLongitude;
  final String? storeAddress;
  final double? storeRating;
  final int? storeReviewCount;

  int get discountPercent =>
      ((1 - discountedPrice / originalPrice) * 100).round();

  String get pickupWindow => '$pickupStart - $pickupEnd';

  bool get isAvailable => remaining > 0;

  factory Basket.fromJson(Map<String, dynamic> json) {
    return Basket(
      id: json['id'] as String,
      storeId: json['storeId'] as String,
      storeName: json['storeName'] as String? ?? '',
      title: json['title'] as String,
      description: json['description'] as String?,
      originalPrice: (json['originalPrice'] as num).toDouble(),
      discountedPrice: (json['discountedPrice'] as num).toDouble(),
      pickupDate: DateTime.parse(json['pickupDate'] as String),
      pickupStart: json['pickupStart'] as String,
      pickupEnd: json['pickupEnd'] as String,
      remaining: json['remaining'] as int? ?? 0,
      imageUrl: json['imageUrl'] as String?,
      storeImageUrl: json['storeImageUrl'] as String?,
      dietaryTags: (json['dietaryTags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      categoryName: json['categoryName'] as String?,
      storeLatitude: (json['storeLatitude'] as num?)?.toDouble(),
      storeLongitude: (json['storeLongitude'] as num?)?.toDouble(),
      storeAddress: json['storeAddress'] as String?,
      storeRating: (json['storeRating'] as num?)?.toDouble(),
      storeReviewCount: json['storeReviewCount'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'storeId': storeId,
        'storeName': storeName,
        'title': title,
        'description': description,
        'originalPrice': originalPrice,
        'discountedPrice': discountedPrice,
        'pickupDate': pickupDate.toIso8601String(),
        'pickupStart': pickupStart,
        'pickupEnd': pickupEnd,
        'remaining': remaining,
        'imageUrl': imageUrl,
        'storeImageUrl': storeImageUrl,
        'dietaryTags': dietaryTags,
        'categoryName': categoryName,
        'storeLatitude': storeLatitude,
        'storeLongitude': storeLongitude,
        'storeAddress': storeAddress,
        'storeRating': storeRating,
        'storeReviewCount': storeReviewCount,
      };
}
