import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/widgets/reservation_card.dart';
import '../../../shared/widgets/status_badge.dart';

final reservationsProvider =
    StateProvider<List<ReservationModel>>((ref) => _demoReservations);

final _demoReservations = <ReservationModel>[
  ReservationModel(
    id: 'res-001',
    basketTitle: 'Panier Surprise du Matin',
    storeName: 'Boulangerie Le Croissant',
    consumerAlias: 'Client A***',
    quantity: 1,
    totalAmount: 150,
    status: ReservationStatus.confirmed,
    reservedAt: DateTime.now().subtract(const Duration(hours: 2)),
    pickupCode: '4821',
  ),
  ReservationModel(
    id: 'res-002',
    basketTitle: 'Corbeille Viennoiseries',
    storeName: 'Boulangerie Le Croissant',
    consumerAlias: 'Client B***',
    quantity: 2,
    totalAmount: 400,
    status: ReservationStatus.ready,
    reservedAt: DateTime.now().subtract(const Duration(hours: 3)),
    pickupCode: '7634',
    pickupTime: DateTime.now().subtract(const Duration(hours: 1)),
  ),
  ReservationModel(
    id: 'res-003',
    basketTitle: 'Box Sandwich & Boissons',
    storeName: 'Epicerie du Marche',
    consumerAlias: 'Client C***',
    quantity: 1,
    totalAmount: 250,
    status: ReservationStatus.pickedUp,
    reservedAt: DateTime.now().subtract(const Duration(days: 1)),
    pickupCode: '2918',
    pickupTime: DateTime.now().subtract(const Duration(hours: 22)),
  ),
  ReservationModel(
    id: 'res-004',
    basketTitle: 'Delices du Marche',
    storeName: 'Epicerie du Marche',
    consumerAlias: 'Client D***',
    quantity: 1,
    totalAmount: 300,
    status: ReservationStatus.noShow,
    reservedAt: DateTime.now().subtract(const Duration(days: 2)),
    pickupCode: '5543',
  ),
];
