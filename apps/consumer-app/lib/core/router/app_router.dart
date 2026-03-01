import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/basket/presentation/screens/basket_detail_screen.dart';
import '../../features/explore/presentation/screens/explore_screen.dart';
import '../../features/favorites/presentation/screens/favorites_screen.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/onboarding/presentation/screens/onboarding_screen.dart';
import '../../features/orders/presentation/screens/orders_screen.dart';
import '../../features/pickup/presentation/screens/qr_pickup_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/reservation/presentation/screens/confirmation_screen.dart';
import '../../features/reservation/presentation/screens/payment_screen.dart';
import '../../features/reservation/presentation/screens/reservation_screen.dart';
import '../../features/store/presentation/screens/store_detail_screen.dart';
import '../../shared/widgets/app_scaffold.dart';
import 'route_names.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: RoutePaths.home,
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final hasCompletedOnboarding = authState.hasCompletedOnboarding;
      final location = state.uri.toString();

      final isAuthRoute =
          location == RoutePaths.login || location == RoutePaths.register;
      final isOnboardingRoute = location == RoutePaths.onboarding;

      if (!isAuthenticated && !isAuthRoute && !isOnboardingRoute) {
        if (!hasCompletedOnboarding) return RoutePaths.onboarding;
        return RoutePaths.login;
      }

      if (isAuthenticated && isAuthRoute) return RoutePaths.home;

      return null;
    },
    routes: [
      // Auth routes
      GoRoute(
        path: RoutePaths.login,
        name: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: RoutePaths.register,
        name: RouteNames.register,
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: RoutePaths.onboarding,
        name: RouteNames.onboarding,
        builder: (context, state) => const OnboardingScreen(),
      ),
      // Main shell with bottom navigation
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppScaffold(navigationShell: navigationShell);
        },
        branches: [
          // Tab 0: Home
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.home,
                name: RouteNames.home,
                builder: (context, state) => const HomeScreen(),
                routes: [
                  GoRoute(
                    path: RoutePaths.storeDetail,
                    name: RouteNames.storeDetail,
                    builder: (context, state) {
                      final storeId = state.pathParameters['storeId']!;
                      return StoreDetailScreen(storeId: storeId);
                    },
                  ),
                  GoRoute(
                    path: RoutePaths.basketDetail,
                    name: RouteNames.basketDetail,
                    builder: (context, state) {
                      final basketId = state.pathParameters['basketId']!;
                      return BasketDetailScreen(basketId: basketId);
                    },
                  ),
                  GoRoute(
                    path: RoutePaths.reservation,
                    name: RouteNames.reservation,
                    builder: (context, state) {
                      final basketId = state.pathParameters['basketId']!;
                      return ReservationScreen(basketId: basketId);
                    },
                  ),
                  GoRoute(
                    path: RoutePaths.payment,
                    name: RouteNames.payment,
                    builder: (context, state) {
                      final reservationId =
                          state.pathParameters['reservationId']!;
                      return PaymentScreen(reservationId: reservationId);
                    },
                  ),
                  GoRoute(
                    path: RoutePaths.confirmation,
                    name: RouteNames.confirmation,
                    builder: (context, state) {
                      final reservationId =
                          state.pathParameters['reservationId']!;
                      return ConfirmationScreen(reservationId: reservationId);
                    },
                  ),
                  GoRoute(
                    path: RoutePaths.qrPickup,
                    name: RouteNames.qrPickup,
                    builder: (context, state) {
                      final reservationId =
                          state.pathParameters['reservationId']!;
                      return QrPickupScreen(reservationId: reservationId);
                    },
                  ),
                ],
              ),
            ],
          ),
          // Tab 1: Explore
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.explore,
                name: RouteNames.explore,
                builder: (context, state) => const ExploreScreen(),
              ),
            ],
          ),
          // Tab 2: Orders
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.orders,
                name: RouteNames.orders,
                builder: (context, state) => const OrdersScreen(),
              ),
            ],
          ),
          // Tab 3: Favorites
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.favorites,
                name: RouteNames.favorites,
                builder: (context, state) => const FavoritesScreen(),
              ),
            ],
          ),
          // Tab 4: Profile
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
    ],
  );
});
