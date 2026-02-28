---
name: create-flutter-test-widget
description: Crée un widget test complet avec mock router + mock providers
argument-hint: <WidgetName>
---

# Create Flutter Widget Test

Crée un test complet pour le widget `$ARGUMENTS`.

## Structure du test

Fichier : `test/<path>/<widget_name>_test.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

// Mocks
class MockRepository extends Mock implements <Repository> {}
class MockGoRouter extends Mock implements GoRouter {}

void main() {
  late MockRepository mockRepository;

  setUp(() {
    mockRepository = MockRepository();
  });

  Widget buildTestWidget({List<Override> overrides = const []}) {
    return ProviderScope(
      overrides: [
        <repository>Provider.overrideWithValue(mockRepository),
        ...overrides,
      ],
      child: MaterialApp(
        home: InheritedGoRouter(
          goRouter: MockGoRouter(),
          child: const <WidgetName>(),
        ),
      ),
    );
  }

  group('<WidgetName>', () {
    testWidgets('renders correctly with data', (tester) async {
      when(() => mockRepository.getAll()).thenAnswer((_) async => [testData]);

      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Expected text'), findsOneWidget);
    });

    testWidgets('shows loading state', (tester) async {
      when(() => mockRepository.getAll()).thenAnswer(
        (_) => Future.delayed(const Duration(seconds: 10), () => []),
      );

      await tester.pumpWidget(buildTestWidget());
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows error state', (tester) async {
      when(() => mockRepository.getAll()).thenThrow(Exception('Error'));

      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Error'), findsOneWidget);
    });

    testWidgets('handles tap interaction', (tester) async {
      when(() => mockRepository.getAll()).thenAnswer((_) async => [testData]);

      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      // Verify interaction result
    });

    testWidgets('has correct semantics', (tester) async {
      when(() => mockRepository.getAll()).thenAnswer((_) async => [testData]);

      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      final semantics = tester.getSemantics(find.byType(<WidgetName>));
      expect(semantics, matchesSemantics(/* expected semantics */));
    });
  });
}
```

## Patterns de test

### Mock providers
```dart
<provider>.overrideWith((ref) => MockNotifier())
```

### Mock navigation
```dart
final mockRouter = MockGoRouter();
when(() => mockRouter.push(any())).thenAnswer((_) async => null);
// Après interaction
verify(() => mockRouter.push('/expected-route')).called(1);
```

### Golden tests
```dart
testWidgets('matches golden', (tester) async {
  await tester.pumpWidget(buildTestWidget());
  await tester.pumpAndSettle();
  await expectLater(find.byType(<WidgetName>), matchesGoldenFile('goldens/<widget_name>.png'));
});
```

## Validation

- [ ] États loading, error, data testés
- [ ] Interactions testées (tap, scroll, input)
- [ ] Semantics vérifiées
- [ ] Mocks correctement configurés
- [ ] Tests passent (`flutter test`)
