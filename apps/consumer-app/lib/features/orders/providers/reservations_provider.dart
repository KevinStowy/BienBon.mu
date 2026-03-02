import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/models/reservation.dart';
import '../../../shared/repositories/reservation_repository.dart';

/// Fetches all reservations for the current user.
final reservationsProvider = FutureProvider<List<Reservation>>((ref) async {
  final repo = ref.watch(reservationRepositoryProvider);
  return repo.getReservations();
});

/// Active reservations (reserved or slotActive).
final activeReservationsProvider = Provider<AsyncValue<List<Reservation>>>((ref) {
  final all = ref.watch(reservationsProvider);
  return all.whenData(
    (list) => list.where((r) => r.isActive).toList(),
  );
});

/// History reservations (pickedUp, noShow, cancelled).
final historyReservationsProvider =
    Provider<AsyncValue<List<Reservation>>>((ref) {
  final all = ref.watch(reservationsProvider);
  return all.whenData(
    (list) => list.where((r) => !r.isActive).toList(),
  );
});

/// Single reservation by ID.
final reservationByIdProvider =
    FutureProvider.family<Reservation, String>((ref, reservationId) async {
  final repo = ref.watch(reservationRepositoryProvider);
  return repo.getReservationById(reservationId);
});
