import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/constants/app_constants.dart';

/// Represents the current authentication state.
class AuthState {
  const AuthState({
    this.isAuthenticated = false,
    this.hasCompletedOnboarding = false,
    this.userId,
    this.userEmail,
    this.userName,
    this.authToken,
    this.isLoading = false,
    this.error,
  });

  final bool isAuthenticated;
  final bool hasCompletedOnboarding;
  final String? userId;
  final String? userEmail;
  final String? userName;
  final String? authToken;
  final bool isLoading;
  final String? error;

  AuthState copyWith({
    bool? isAuthenticated,
    bool? hasCompletedOnboarding,
    String? userId,
    String? userEmail,
    String? userName,
    String? authToken,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      hasCompletedOnboarding:
          hasCompletedOnboarding ?? this.hasCompletedOnboarding,
      userId: userId ?? this.userId,
      userEmail: userEmail ?? this.userEmail,
      userName: userName ?? this.userName,
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
    final onboardingDone =
        prefs.getBool(AppConstants.keyOnboardingDone) ?? false;

    if (token != null) {
      state = state.copyWith(
        isAuthenticated: true,
        hasCompletedOnboarding: true,
        authToken: token,
      );
    } else {
      state = state.copyWith(hasCompletedOnboarding: onboardingDone);
    }
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      // Simulate API call — replace with real auth once backend is live.
      await Future.delayed(const Duration(milliseconds: 800));

      if (email.isEmpty || password.isEmpty) {
        throw Exception('Email et mot de passe requis');
      }

      const fakeToken = 'demo-token-bienbon-2024';
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(AppConstants.keyAuthToken, fakeToken);
      await prefs.setBool(AppConstants.keyOnboardingDone, true);

      state = state.copyWith(
        isAuthenticated: true,
        hasCompletedOnboarding: true,
        userEmail: email,
        userName: email.split('@').first,
        userId: 'user-demo-001',
        authToken: fakeToken,
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

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await Future.delayed(const Duration(milliseconds: 800));

      if (name.isEmpty || email.isEmpty || password.isEmpty) {
        throw Exception('Tous les champs sont requis');
      }
      if (password.length < 8) {
        throw Exception('Le mot de passe doit contenir au moins 8 caracteres');
      }

      const fakeToken = 'demo-token-bienbon-register-2024';
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(AppConstants.keyAuthToken, fakeToken);
      await prefs.setBool(AppConstants.keyOnboardingDone, true);

      state = state.copyWith(
        isAuthenticated: true,
        hasCompletedOnboarding: true,
        userEmail: email,
        userName: name,
        userId: 'user-new-001',
        authToken: fakeToken,
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
    state = const AuthState(hasCompletedOnboarding: true);
  }

  Future<void> completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(AppConstants.keyOnboardingDone, true);
    state = state.copyWith(hasCompletedOnboarding: true);
  }
}

final authStateProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
