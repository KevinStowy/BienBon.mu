import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/models/consumer_profile.dart';
import '../../../shared/repositories/profile_repository.dart';

/// Manages the current user's profile.
class ProfileNotifier
    extends StateNotifier<AsyncValue<ConsumerProfile>> {
  ProfileNotifier(this._repo) : super(const AsyncValue.loading()) {
    _load();
  }

  final ProfileRepository _repo;

  Future<void> _load() async {
    try {
      final profile = await _repo.getProfile();
      state = AsyncValue.data(profile);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> updateProfile({
    String? firstName,
    String? lastName,
    String? phone,
    List<String>? dietaryPreferences,
    String? language,
  }) async {
    try {
      final updated = await _repo.updateProfile(
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        dietaryPreferences: dietaryPreferences,
        language: language,
      );
      state = AsyncValue.data(updated);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async => _load();
}

final profileProvider =
    StateNotifierProvider<ProfileNotifier, AsyncValue<ConsumerProfile>>((ref) {
  final repo = ref.watch(profileRepositoryProvider);
  return ProfileNotifier(repo);
});
