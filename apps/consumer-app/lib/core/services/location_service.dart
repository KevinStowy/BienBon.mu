import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// User location data. Position is NEVER sent to the server (ADR-016).
class UserLocation {
  const UserLocation({
    required this.latitude,
    required this.longitude,
  });

  final double latitude;
  final double longitude;

  /// Port-Louis fallback coordinates.
  static const UserLocation portLouis = UserLocation(
    latitude: -20.1609,
    longitude: 57.4977,
  );
}

/// Calculate distance in km between two points using Haversine formula.
/// This runs client-side only (ADR-016: position never sent to server).
double calculateDistanceKm({
  required double lat1,
  required double lon1,
  required double lat2,
  required double lon2,
}) {
  const earthRadius = 6371.0; // km
  final dLat = _degToRad(lat2 - lat1);
  final dLon = _degToRad(lon2 - lon1);
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_degToRad(lat1)) *
          math.cos(_degToRad(lat2)) *
          math.sin(dLon / 2) *
          math.sin(dLon / 2);
  final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  return earthRadius * c;
}

double _degToRad(double deg) => deg * (math.pi / 180);

/// Location state notifier. Tries device geolocation, falls back to Port-Louis.
class LocationNotifier extends StateNotifier<UserLocation> {
  LocationNotifier() : super(UserLocation.portLouis) {
    _initLocation();
  }

  bool _permissionDenied = false;
  bool get permissionDenied => _permissionDenied;

  Future<void> _initLocation() async {
    // In a real implementation, this would use geolocator package.
    // For now, we default to Port-Louis and try to get real location
    // when the geolocator dependency is available.
    try {
      // Attempt to use geolocator if available
      await _tryGetDeviceLocation();
    } catch (_) {
      // Fallback to Port-Louis
      _permissionDenied = true;
    }
  }

  Future<void> _tryGetDeviceLocation() async {
    // This will be implemented once geolocator package is added.
    // For now fallback is Port-Louis per US-C013 spec.
  }

  /// Manually update location (e.g. from a city picker).
  void updateLocation(double lat, double lng) {
    state = UserLocation(latitude: lat, longitude: lng);
  }

  /// Re-center to device location.
  Future<void> recenter() async {
    await _tryGetDeviceLocation();
  }
}

final locationProvider =
    StateNotifierProvider<LocationNotifier, UserLocation>((ref) {
  return LocationNotifier();
});
