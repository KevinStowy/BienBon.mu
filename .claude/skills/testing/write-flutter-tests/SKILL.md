---
name: write-flutter-tests
description: Écrit des tests Flutter (unit + widget + integration)
argument-hint: <feature-or-file>
---

# Write Flutter Tests

Écrit des tests Flutter pour `$ARGUMENTS`.

## Unit Tests — Providers & Services

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockBasketRepository extends Mock implements BasketRepository {}

void main() {
  late MockBasketRepository mockRepo;
  late ProviderContainer container;

  setUp(() {
    mockRepo = MockBasketRepository();
    container = ProviderContainer(overrides: [
      basketRepositoryProvider.overrideWithValue(mockRepo),
    ]);
  });

  tearDown(() => container.dispose());

  test('loads baskets on init', () async {
    when(() => mockRepo.getAll()).thenAnswer((_) async => [testBasket]);

    final future = container.read(basketListProvider.future);
    final result = await future;

    expect(result, hasLength(1));
    verify(() => mockRepo.getAll()).called(1);
  });

  test('handles error gracefully', () async {
    when(() => mockRepo.getAll()).thenThrow(Exception('Network error'));

    final state = await container.read(basketListProvider.future)
        .then((_) => fail('should throw'))
        .catchError((e) => e);

    expect(state, isA<Exception>());
  });
}
```

## Widget Tests

```dart
testWidgets('BasketCard displays correct info', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [],
      child: MaterialApp(
        home: BasketCard(basket: testBasket),
      ),
    ),
  );

  expect(find.text(testBasket.name), findsOneWidget);
  expect(find.text('Rs ${testBasket.discountedPrice}'), findsOneWidget);

  // Accessibility
  final semantics = tester.getSemantics(find.byType(BasketCard));
  expect(semantics.label, contains(testBasket.name));
});
```

## Integration Tests

```dart
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('full reservation flow', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    // Navigate to explore
    await tester.tap(find.byIcon(Icons.explore));
    await tester.pumpAndSettle();

    // Select first basket
    await tester.tap(find.byType(BasketCard).first);
    await tester.pumpAndSettle();

    // Reserve
    await tester.tap(find.text('Réserver'));
    await tester.pumpAndSettle();

    expect(find.text('Réservation confirmée'), findsOneWidget);
  });
}
```

## Conventions

- `mocktail` pour les mocks (pas mockito)
- `ProviderContainer` pour les tests de providers (pas de widget)
- `ProviderScope` avec overrides pour les widget tests
- Factories pour les données de test : `createTestBasket()`, `createTestStore()`

## Validation

- [ ] Unit tests pour tous les providers
- [ ] Widget tests pour les widgets clés
- [ ] Integration test pour le flux principal
- [ ] `flutter test` passe
- [ ] Semantics vérifiées dans les widget tests
