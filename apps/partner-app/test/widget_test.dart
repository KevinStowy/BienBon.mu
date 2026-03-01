import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:partner_app/app.dart';

void main() {
  testWidgets('Partner app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: PartnerApp(),
      ),
    );
    await tester.pump();
    expect(find.byType(MaterialApp), findsNothing);
    expect(find.byType(ProviderScope), findsOneWidget);
  });
}
