import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/models/claim.dart';
import '../../../shared/repositories/claim_repository.dart';

/// Fetches all claims for the current user.
final claimsProvider = FutureProvider<List<Claim>>((ref) async {
  final repo = ref.watch(claimRepositoryProvider);
  return repo.getClaims();
});

/// Single claim by ID.
final claimByIdProvider =
    FutureProvider.family<Claim, String>((ref, claimId) async {
  final repo = ref.watch(claimRepositoryProvider);
  return repo.getClaimById(claimId);
});
