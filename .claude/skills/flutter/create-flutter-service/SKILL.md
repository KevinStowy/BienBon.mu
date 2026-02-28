---
name: create-flutter-service
description: Crée un service Flutter (http client, auth, location, etc.)
argument-hint: <ServiceName>
---

# Create Flutter Service

Crée un service Flutter `$ARGUMENTS` avec provider Riverpod.

## Étape 1 — Créer le service

Fichier : `lib/core/services/<service_name>_service.dart`

```dart
class <ServiceName>Service {
  final Dio _dio;

  <ServiceName>Service(this._dio);

  Future<<ResultType>> doSomething(<InputType> input) async {
    try {
      final response = await _dio.post('/endpoint', data: input.toJson());
      return <ResultType>.fromJson(response.data);
    } on DioException catch (e) {
      throw <ServiceName>Exception.fromDio(e);
    }
  }
}

class <ServiceName>Exception implements Exception {
  final String message;
  final int? statusCode;

  <ServiceName>Exception(this.message, {this.statusCode});

  factory <ServiceName>Exception.fromDio(DioException e) {
    return <ServiceName>Exception(
      e.response?.data?['message'] ?? e.message ?? 'Unknown error',
      statusCode: e.response?.statusCode,
    );
  }
}
```

## Étape 2 — Provider Riverpod

```dart
@riverpod
<ServiceName>Service <serviceName>Service(ref) {
  return <ServiceName>Service(ref.read(dioProvider));
}
```

## Étape 3 — Erreurs typées

Chaque service a ses propres exceptions typées, pas des `Exception` génériques.

## Étape 4 — Tests

```dart
test('doSomething succeeds', () async {
  final mockDio = MockDio();
  when(() => mockDio.post(any(), data: any(named: 'data')))
      .thenAnswer((_) async => Response(data: {...}, statusCode: 200, requestOptions: RequestOptions()));

  final service = <ServiceName>Service(mockDio);
  final result = await service.doSomething(input);
  expect(result, isA<<ResultType>>());
});

test('doSomething throws on network error', () async {
  final mockDio = MockDio();
  when(() => mockDio.post(any(), data: any(named: 'data')))
      .thenThrow(DioException(type: DioExceptionType.connectionTimeout, requestOptions: RequestOptions()));

  final service = <ServiceName>Service(mockDio);
  expect(() => service.doSomething(input), throwsA(isA<<ServiceName>Exception>()));
});
```

## Validation

- [ ] Service avec injection de dépendances (Dio, etc.)
- [ ] Erreurs typées (pas de `Exception` générique)
- [ ] Provider Riverpod enregistré
- [ ] Tests couvrent succès + erreurs
