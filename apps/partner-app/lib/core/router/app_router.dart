import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/baskets/screens/basket_detail_screen.dart';
import '../../features/baskets/screens/basket_form_screen.dart';
import '../../features/baskets/screens/basket_list_screen.dart';
import '../../features/baskets/screens/manage_stock_screen.dart';
import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/pickup/screens/pickup_confirmation_screen.dart';
import '../../features/pickup/screens/qr_scanner_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/reservations/screens/reservation_detail_screen.dart';
import '../../features/reservations/screens/reservations_list_screen.dart';
import '../../features/revenue/screens/revenue_screen.dart';
import '../../features/stores/screens/store_detail_screen.dart';
import '../../features/stores/screens/stores_list_screen.dart';
import '../../shared/widgets/partner_scaffold.dart';
import 'route_names.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: RoutePaths.dashboard,
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final location = state.uri.toString();
      final isLoginRoute = location == RoutePaths.login;

      if (!isAuthenticated && !isLoginRoute) {
        return RoutePaths.login;
      }
      if (isAuthenticated && isLoginRoute) {
        return RoutePaths.dashboard;
      }
      return null;
    },
    routes: [
      // Auth
      GoRoute(
        path: RoutePaths.login,
        name: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),

      // Main shell with bottom navigation (4 tabs)
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return PartnerScaffold(navigationShell: navigationShell);
        },
        branches: [
          // Tab 0: Dashboard
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.dashboard,
                name: RouteNames.dashboard,
                builder: (context, state) => const DashboardScreen(),
                routes: [
                  GoRoute(
                    path: RoutePaths.storesList,
                    name: RouteNames.storesList,
                    builder: (context, state) => const StoresListScreen(),
                    routes: [
                      GoRoute(
                        path: 'detail/:storeId',
                        name: RouteNames.storeDetail,
                        builder: (context, state) {
                          final storeId = state.pathParameters['storeId']!;
                          return StoreDetailScreen(storeId: storeId);
                        },
                      ),
                    ],
                  ),
                  GoRoute(
                    path: RoutePaths.reservations,
                    name: RouteNames.reservations,
                    builder: (context, state) => const ReservationsListScreen(),
                    routes: [
                      GoRoute(
                        path: RoutePaths.reservationDetail,
                        name: RouteNames.reservationDetail,
                        builder: (context, state) {
                          final reservationId =
                              state.pathParameters['reservationId']!;
                          return ReservationDetailScreen(
                            reservationId: reservationId,
                          );
                        },
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'revenue',
                    name: RouteNames.revenue,
                    builder: (context, state) => const RevenueScreen(),
                  ),
                ],
              ),
            ],
          ),

          // Tab 1: Baskets
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.baskets,
                name: RouteNames.baskets,
                builder: (context, state) => const BasketListScreen(),
                routes: [
                  GoRoute(
                    path: RoutePaths.basketCreate,
                    name: RouteNames.basketCreate,
                    builder: (context, state) => const BasketFormScreen(),
                  ),
                  GoRoute(
                    path: RoutePaths.basketDetail,
                    name: RouteNames.basketDetail,
                    builder: (context, state) {
                      final basketId = state.pathParameters['basketId']!;
                      return BasketDetailScreen(basketId: basketId);
                    },
                    routes: [
                      GoRoute(
                        path: 'edit',
                        name: RouteNames.basketEdit,
                        builder: (context, state) {
                          final basketId = state.pathParameters['basketId']!;
                          return BasketFormScreen(basketId: basketId);
                        },
                      ),
                      GoRoute(
                        path: 'stock',
                        name: RouteNames.manageStock,
                        builder: (context, state) {
                          final basketId = state.pathParameters['basketId']!;
                          return ManageStockScreen(basketId: basketId);
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),

          // Tab 2: Pickup / QR Scanner
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.pickupScan,
                name: RouteNames.pickupScan,
                builder: (context, state) => const QrScannerScreen(),
              ),
            ],
          ),

          // Tab 3: Profile
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.profile,
                name: RouteNames.profile,
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),

      // Full-screen routes (outside shell)
      GoRoute(
        path: RoutePaths.pickupConfirmation,
        name: RouteNames.pickupConfirmation,
        builder: (context, state) => const PickupConfirmationScreen(),
      ),
    ],
  );
});
