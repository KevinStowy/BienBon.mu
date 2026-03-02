import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/models/gamification.dart';
import '../../../shared/repositories/gamification_repository.dart';

/// Fetches impact stats (badges, monthly stats, totals).
final impactStatsProvider = FutureProvider<ImpactStats>((ref) async {
  final repo = ref.watch(gamificationRepositoryProvider);
  return repo.getImpactStats();
});

/// Fetches the user's referral code.
final referralCodeProvider = FutureProvider<String>((ref) async {
  final repo = ref.watch(gamificationRepositoryProvider);
  return repo.getReferralCode();
});
