import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../constants/app_constants.dart';

/// Minimal HTTP client wrapper for BienBon Partner API.
class ApiClient {
  ApiClient({required this.authToken});

  final String? authToken;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (authToken != null) 'Authorization': 'Bearer $authToken',
      };

  Future<http.Response> get(String path) {
    return http.get(
      Uri.parse('${AppConstants.baseUrl}$path'),
      headers: _headers,
    );
  }

  Future<http.Response> post(String path, {Object? body}) {
    return http.post(
      Uri.parse('${AppConstants.baseUrl}$path'),
      headers: _headers,
      body: body,
    );
  }

  Future<http.Response> put(String path, {Object? body}) {
    return http.put(
      Uri.parse('${AppConstants.baseUrl}$path'),
      headers: _headers,
      body: body,
    );
  }

  Future<http.Response> patch(String path, {Object? body}) {
    return http.patch(
      Uri.parse('${AppConstants.baseUrl}$path'),
      headers: _headers,
      body: body,
    );
  }
}

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(authToken: null);
});
