/// Partner store model.
class Store {
  const Store({
    required this.id,
    required this.name,
    required this.category,
    required this.address,
    this.description,
    required this.latitude,
    required this.longitude,
    this.rating = 0,
    this.reviewCount = 0,
    this.basketCount = 0,
    this.imageUrl,
    this.photos = const [],
    this.openingHours,
    this.phone,
    this.isFavorite = false,
  });

  final String id;
  final String name;
  final String category;
  final String address;
  final String? description;
  final double latitude;
  final double longitude;
  final double rating;
  final int reviewCount;
  final int basketCount;
  final String? imageUrl;
  final List<String> photos;
  final String? openingHours;
  final String? phone;
  final bool isFavorite;

  Store copyWith({
    bool? isFavorite,
    int? basketCount,
  }) {
    return Store(
      id: id,
      name: name,
      category: category,
      address: address,
      description: description,
      latitude: latitude,
      longitude: longitude,
      rating: rating,
      reviewCount: reviewCount,
      basketCount: basketCount ?? this.basketCount,
      imageUrl: imageUrl,
      photos: photos,
      openingHours: openingHours,
      phone: phone,
      isFavorite: isFavorite ?? this.isFavorite,
    );
  }

  factory Store.fromJson(Map<String, dynamic> json) {
    return Store(
      id: json['id'] as String,
      name: json['name'] as String,
      category: json['category'] as String? ?? 'Divers',
      address: json['address'] as String? ?? '',
      description: json['description'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble() ?? -20.1609,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 57.4977,
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      reviewCount: json['reviewCount'] as int? ?? 0,
      basketCount: json['basketCount'] as int? ?? 0,
      imageUrl: json['imageUrl'] as String?,
      photos: (json['photos'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      openingHours: json['openingHours'] as String?,
      phone: json['phone'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'category': category,
        'address': address,
        'description': description,
        'latitude': latitude,
        'longitude': longitude,
        'rating': rating,
        'reviewCount': reviewCount,
        'basketCount': basketCount,
        'imageUrl': imageUrl,
        'photos': photos,
        'openingHours': openingHours,
        'phone': phone,
      };
}
