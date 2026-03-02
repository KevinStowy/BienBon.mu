/// Consumer profile model (US-C054).
class ConsumerProfile {
  const ConsumerProfile({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    this.photoUrl,
    this.dietaryPreferences = const [],
    this.language = 'fr',
    this.totalBasketsSaved = 0,
    this.totalSavings = 0,
    this.referralCode,
    this.referralsCount = 0,
  });

  final String id;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final String? photoUrl;
  final List<String> dietaryPreferences;
  final String language;
  final int totalBasketsSaved;
  final double totalSavings;
  final String? referralCode;
  final int referralsCount;

  String get displayName => '$firstName $lastName';

  ConsumerProfile copyWith({
    String? firstName,
    String? lastName,
    String? email,
    String? phone,
    String? photoUrl,
    List<String>? dietaryPreferences,
    String? language,
    int? totalBasketsSaved,
    double? totalSavings,
  }) {
    return ConsumerProfile(
      id: id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      photoUrl: photoUrl ?? this.photoUrl,
      dietaryPreferences: dietaryPreferences ?? this.dietaryPreferences,
      language: language ?? this.language,
      totalBasketsSaved: totalBasketsSaved ?? this.totalBasketsSaved,
      totalSavings: totalSavings ?? this.totalSavings,
      referralCode: referralCode,
      referralsCount: referralsCount,
    );
  }

  factory ConsumerProfile.fromJson(Map<String, dynamic> json) {
    return ConsumerProfile(
      id: json['id'] as String,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      photoUrl: json['photoUrl'] as String?,
      dietaryPreferences: (json['dietaryPreferences'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      language: json['language'] as String? ?? 'fr',
      totalBasketsSaved: json['totalBasketsSaved'] as int? ?? 0,
      totalSavings: (json['totalSavings'] as num?)?.toDouble() ?? 0,
      referralCode: json['referralCode'] as String?,
      referralsCount: json['referralsCount'] as int? ?? 0,
    );
  }
}
