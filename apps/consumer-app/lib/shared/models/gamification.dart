/// Badge model (US-C059).
class Badge {
  const Badge({
    required this.id,
    required this.name,
    required this.description,
    required this.requiredCount,
    this.isUnlocked = false,
    this.unlockedAt,
    this.iconName,
  });

  final String id;
  final String name;
  final String description;
  final int requiredCount;
  final bool isUnlocked;
  final DateTime? unlockedAt;
  final String? iconName;

  factory Badge.fromJson(Map<String, dynamic> json) {
    return Badge(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      requiredCount: json['requiredCount'] as int? ?? 0,
      isUnlocked: json['isUnlocked'] as bool? ?? false,
      unlockedAt: json['unlockedAt'] != null
          ? DateTime.parse(json['unlockedAt'] as String)
          : null,
      iconName: json['iconName'] as String?,
    );
  }
}

/// Impact statistics (US-C059).
class ImpactStats {
  const ImpactStats({
    this.totalBasketsSaved = 0,
    this.totalSavings = 0,
    this.badges = const [],
    this.monthlyStats = const [],
  });

  final int totalBasketsSaved;
  final double totalSavings;
  final List<Badge> badges;
  final List<MonthlyStat> monthlyStats;

  factory ImpactStats.fromJson(Map<String, dynamic> json) {
    return ImpactStats(
      totalBasketsSaved: json['totalBasketsSaved'] as int? ?? 0,
      totalSavings: (json['totalSavings'] as num?)?.toDouble() ?? 0,
      badges: (json['badges'] as List<dynamic>?)
              ?.map((e) => Badge.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      monthlyStats: (json['monthlyStats'] as List<dynamic>?)
              ?.map((e) => MonthlyStat.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}

class MonthlyStat {
  const MonthlyStat({
    required this.month,
    required this.basketsSaved,
    required this.savings,
  });

  final String month;
  final int basketsSaved;
  final double savings;

  factory MonthlyStat.fromJson(Map<String, dynamic> json) {
    return MonthlyStat(
      month: json['month'] as String,
      basketsSaved: json['basketsSaved'] as int? ?? 0,
      savings: (json['savings'] as num?)?.toDouble() ?? 0,
    );
  }
}

/// Default badges defined in US-C059.
abstract final class DefaultBadges {
  static const List<Badge> all = [
    Badge(
      id: 'premier-pas',
      name: 'Premier pas',
      description: '1er panier sauve',
      requiredCount: 1,
      iconName: 'footprint',
    ),
    Badge(
      id: 'eco-citoyen',
      name: 'Eco-citoyen',
      description: '5 paniers sauves',
      requiredCount: 5,
      iconName: 'leaf',
    ),
    Badge(
      id: 'super-sauveur',
      name: 'Super Sauveur',
      description: '25 paniers sauves',
      requiredCount: 25,
      iconName: 'shield',
    ),
    Badge(
      id: 'heros-anti-gaspi',
      name: 'Heros anti-gaspi',
      description: '50 paniers sauves',
      requiredCount: 50,
      iconName: 'star',
    ),
    Badge(
      id: 'legende-bienbon',
      name: 'Legende BienBon',
      description: '100 paniers sauves',
      requiredCount: 100,
      iconName: 'trophy',
    ),
    Badge(
      id: 'parrain',
      name: 'Parrain/Marraine',
      description: '1er filleul inscrit',
      requiredCount: 1,
      iconName: 'people',
    ),
    Badge(
      id: 'ambassadeur',
      name: 'Ambassadeur',
      description: '5 filleuls inscrits',
      requiredCount: 5,
      iconName: 'flag',
    ),
  ];
}
