import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers/api_provider.dart';
import '../models/claim.dart';

/// Repository for claim operations.
class ClaimRepository {
  ClaimRepository(this._api);
  final ApiClient _api;

  Future<List<Claim>> getClaims() async {
    final data = await _api.get('/api/claims');
    if (data is List) {
      return data
          .map((e) => Claim.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => Claim.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<Claim> createClaim({
    required String reservationId,
    required String reason,
    required String description,
    List<String>? photoUrls,
  }) async {
    final data = await _api.post('/api/claims', body: {
      'reservationId': reservationId,
      'reason': reason,
      'description': description,
      if (photoUrls != null) 'photoUrls': photoUrls,
    });
    return Claim.fromJson(data as Map<String, dynamic>);
  }

  Future<Claim> getClaimById(String id) async {
    final data = await _api.get('/api/claims/$id');
    return Claim.fromJson(data as Map<String, dynamic>);
  }
}

final claimRepositoryProvider = Provider<ClaimRepository>((ref) {
  return ClaimRepository(ref.watch(apiClientProvider));
});
