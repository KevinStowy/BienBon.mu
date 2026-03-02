import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';
import '../../features/auth/providers/auth_provider.dart';

/// Global ApiClient provider that syncs auth token from AuthState.
final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient();
  final authState = ref.watch(authStateProvider);
  if (authState.authToken != null) {
    client.setAuthToken(authState.authToken!);
  }
  ref.onDispose(() => client.dispose());
  return client;
});
