import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers/api_provider.dart';
import '../models/reservation.dart';

/// Repository for reservation operations.
class ReservationRepository {
  ReservationRepository(this._api);
  final ApiClient _api;

  Future<List<Reservation>> getReservations({
    Map<String, dynamic>? queryParams,
  }) async {
    final data =
        await _api.get('/api/reservations', queryParams: queryParams);
    if (data is List) {
      return data
          .map((e) => Reservation.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => Reservation.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<Reservation> getReservationById(String id) async {
    final data = await _api.get('/api/reservations/$id');
    return Reservation.fromJson(data as Map<String, dynamic>);
  }

  Future<Reservation> createReservation({
    required String basketId,
    required int quantity,
  }) async {
    final data = await _api.post('/api/reservations', body: {
      'basketId': basketId,
      'quantity': quantity,
    });
    return Reservation.fromJson(data as Map<String, dynamic>);
  }

  Future<Reservation> cancelReservation(String id) async {
    final data = await _api.post('/api/reservations/$id/cancel');
    return Reservation.fromJson(data as Map<String, dynamic>);
  }

  Future<void> processPayment({
    required String reservationId,
    required String paymentMethod,
    Map<String, dynamic>? paymentDetails,
  }) async {
    await _api.post('/api/reservations/$reservationId/pay', body: {
      'paymentMethod': paymentMethod,
      if (paymentDetails != null) ...paymentDetails,
    });
  }
}

final reservationRepositoryProvider = Provider<ReservationRepository>((ref) {
  return ReservationRepository(ref.watch(apiClientProvider));
});
