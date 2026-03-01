import 'dart:convert';

import 'package:http/http.dart' as http;

import '../constants/app_constants.dart';

/// Lightweight HTTP client for BienBon REST API.
///
/// Responsibilities:
/// - Adds `Authorization: Bearer <token>` header when a token is set.
/// - Parses JSON responses.
/// - Throws [ApiException] for non-2xx status codes.
class ApiClient {
  ApiClient({
    http.Client? httpClient,
    String? baseUrl,
  })  : _client = httpClient ?? http.Client(),
        _baseUrl = baseUrl ?? AppConstants.apiBaseUrl;

  final http.Client _client;
  final String _baseUrl;
  String? _authToken;

  void setAuthToken(String token) => _authToken = token;
  void clearAuthToken() => _authToken = null;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
      };

  Uri _uri(String path, [Map<String, dynamic>? queryParams]) {
    final uri = Uri.parse('$_baseUrl$path');
    if (queryParams == null) return uri;
    return uri.replace(queryParameters: queryParams.map(
      (k, v) => MapEntry(k, v.toString()),
    ));
  }

  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? queryParams,
  }) async {
    final response = await _client.get(
      _uri(path, queryParams),
      headers: _headers,
    );
    return _parseResponse(response);
  }

  Future<dynamic> post(String path, {Object? body}) async {
    final response = await _client.post(
      _uri(path),
      headers: _headers,
      body: body != null ? jsonEncode(body) : null,
    );
    return _parseResponse(response);
  }

  Future<dynamic> patch(String path, {Object? body}) async {
    final response = await _client.patch(
      _uri(path),
      headers: _headers,
      body: body != null ? jsonEncode(body) : null,
    );
    return _parseResponse(response);
  }

  Future<dynamic> delete(String path) async {
    final response = await _client.delete(
      _uri(path),
      headers: _headers,
    );
    return _parseResponse(response);
  }

  dynamic _parseResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    }
    throw ApiException(
      statusCode: response.statusCode,
      message: _extractErrorMessage(response.body),
    );
  }

  String _extractErrorMessage(String body) {
    try {
      final json = jsonDecode(body) as Map<String, dynamic>;
      return json['message'] as String? ?? body;
    } catch (_) {
      return body;
    }
  }

  void dispose() => _client.close();
}

class ApiException implements Exception {
  const ApiException({
    required this.statusCode,
    required this.message,
  });

  final int statusCode;
  final String message;

  bool get isUnauthorized => statusCode == 401;
  bool get isNotFound => statusCode == 404;
  bool get isServerError => statusCode >= 500;

  @override
  String toString() => 'ApiException($statusCode): $message';
}
