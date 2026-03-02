import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers/api_provider.dart';
import '../models/consumer_profile.dart';

/// Repository for consumer profile operations.
class ProfileRepository {
  ProfileRepository(this._api);
  final ApiClient _api;

  Future<ConsumerProfile> getProfile() async {
    final data = await _api.get('/api/profile');
    return ConsumerProfile.fromJson(data as Map<String, dynamic>);
  }

  Future<ConsumerProfile> updateProfile({
    String? firstName,
    String? lastName,
    String? phone,
    List<String>? dietaryPreferences,
    String? language,
  }) async {
    final body = <String, dynamic>{};
    if (firstName != null) body['firstName'] = firstName;
    if (lastName != null) body['lastName'] = lastName;
    if (phone != null) body['phone'] = phone;
    if (dietaryPreferences != null) {
      body['dietaryPreferences'] = dietaryPreferences;
    }
    if (language != null) body['language'] = language;

    final data = await _api.patch('/api/profile', body: body);
    return ConsumerProfile.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteAccount() async {
    await _api.delete('/api/profile');
  }

  Future<String> exportData() async {
    final data = await _api.get('/api/profile/export');
    if (data is Map) {
      return data['downloadUrl'] as String? ?? '';
    }
    return '';
  }
}

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository(ref.watch(apiClientProvider));
});
