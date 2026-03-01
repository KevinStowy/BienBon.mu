import 'package:consumer_app/app.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('BienBon app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: BienBonApp(),
      ),
    );
    // Allow async providers to settle
    await tester.pump(const Duration(milliseconds: 500));
    // Verify the app starts without crashing
    expect(find.byType(BienBonApp), findsOneWidget);
  });
}
