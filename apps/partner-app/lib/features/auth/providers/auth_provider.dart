import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/constants/app_constants.dart';

/// Authentication state for the partner app.
class AuthState {
  const AuthState({
    this.isAuthenticated = false,
    this.partnerId,
    this.partnerEmail,
    this.partnerName,
    this.authToken,
    this.isLoading = false,
    this.error,
  });

  final bool isAuthenticated;
  final String? partnerId;
  final String? partnerEmail;
  final String? partnerName;
  final String? authToken;
  final bool isLoading;
  final String? error;

  AuthState copyWith({
    bool? isAuthenticated,
    String? partnerId,
    String? partnerEmail,
    String? partnerName,
    String? authToken,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      partnerId: partnerId ?? this.partnerId,
      partnerEmail: partnerEmail ?? this.partnerEmail,
      partnerName: partnerName ?? this.partnerName,
      authToken: authToken ?? this.authToken,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _init();
  }

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(AppConstants.keyAuthToken);
    final email = prefs.getString(AppConstants.keyPartnerEmail);
    final name = prefs.getString(AppConstants.keyPartnerName);
    final id = prefs.getString(AppConstants.keyPartnerId);

    if (token != null) {
      state = state.copyWith(
        isAuthenticated: true,
        authToken: token,
        partnerEmail: email,
        partnerName: name,
        partnerId: id,
      );
    }
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await Future.delayed(const Duration(milliseconds: 800));

      if (email.isEmpty || password.isEmpty) {
        throw Exception('Email et mot de passe requis');
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(AppConstants.keyAuthToken, AppConstants.demoToken);
      await prefs.setString(AppConstants.keyPartnerEmail, email);
      await prefs.setString(
        AppConstants.keyPartnerName,
        email.split('@').first,
      );
      await prefs.setString(AppConstants.keyPartnerId, 'partner-demo-001');

      state = state.copyWith(
        isAuthenticated: true,
        partnerEmail: email,
        partnerName: email.split('@').first,
        partnerId: 'partner-demo-001',
        authToken: AppConstants.demoToken,
        isLoading: false,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.keyAuthToken);
    await prefs.remove(AppConstants.keyPartnerEmail);
    await prefs.remove(AppConstants.keyPartnerName);
    await prefs.remove(AppConstants.keyPartnerId);
    state = const AuthState();
  }
}

final authStateProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
