import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers/api_provider.dart';
import '../models/gamification.dart';

/// Repository for gamification/impact operations.
class GamificationRepository {
  GamificationRepository(this._api);
  final ApiClient _api;

  Future<ImpactStats> getImpactStats() async {
    final data = await _api.get('/api/impact');
    return ImpactStats.fromJson(data as Map<String, dynamic>);
  }

  Future<List<Badge>> getBadges() async {
    final data = await _api.get('/api/impact/badges');
    if (data is List) {
      return data
          .map((e) => Badge.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => Badge.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<String> getReferralCode() async {
    final data = await _api.get('/api/referral');
    if (data is Map) {
      return data['code'] as String? ?? '';
    }
    return '';
  }
}

final gamificationRepositoryProvider =
    Provider<GamificationRepository>((ref) {
  return GamificationRepository(ref.watch(apiClientProvider));
});
