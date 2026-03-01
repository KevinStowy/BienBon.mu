import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/baskets_provider.dart';

class ManageStockScreen extends ConsumerStatefulWidget {
  const ManageStockScreen({super.key, required this.basketId});

  final String basketId;

  @override
  ConsumerState<ManageStockScreen> createState() => _ManageStockScreenState();
}

class _ManageStockScreenState extends ConsumerState<ManageStockScreen> {
  late TextEditingController _controller;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final baskets = ref.read(partnersBasketListProvider);
      final basket = baskets.firstWhere(
        (b) => b.id == widget.basketId,
        orElse: () => baskets.first,
      );
      _controller.text = basket.stock.toString();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final value = int.tryParse(_controller.text);
    if (value == null || value < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Valeur invalide')),
      );
      return;
    }
    setState(() => _isSaving = true);
    await Future.delayed(const Duration(milliseconds: 400));
    if (mounted) {
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Stock mis a jour !'),
          backgroundColor: AppColors.green700,
        ),
      );
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final baskets = ref.watch(partnersBasketListProvider);
    final basket = baskets.firstWhere(
      (b) => b.id == widget.basketId,
      orElse: () => baskets.first,
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Ajustement du stock'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Current basket info
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(AppRadius.card),
                boxShadow: AppShadow.sm,
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.green100,
                      borderRadius: BorderRadius.circular(AppRadius.card),
                    ),
                    child: const Icon(
                      Icons.shopping_bag_outlined,
                      color: AppColors.green700,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          basket.title,
                          style: Theme.of(context).textTheme.headlineMedium,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          'Stock actuel: ${basket.stock} / ${basket.totalStock}',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            Text(
              'Nouveau stock disponible',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppSpacing.md),

            // Big number input
            Semantics(
              label: 'Nombre de paniers disponibles',
              child: TextFormField(
                controller: _controller,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      fontSize: 48,
                      color: AppColors.green700,
                    ),
                decoration: const InputDecoration(
                  hintText: '0',
                  suffixText: 'paniers',
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Quick preset buttons
            Text(
              'Presets rapides',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              children: [1, 2, 3, 5, 10].map((n) {
                return Semantics(
                  label: 'Definir stock a $n',
                  button: true,
                  child: OutlinedButton(
                    onPressed: () {
                      _controller.text = n.toString();
                    },
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(60, 44),
                    ),
                    child: Text('$n'),
                  ),
                );
              }).toList(),
            ),
            const Spacer(),

            ElevatedButton(
              onPressed: _isSaving ? null : _save,
              child: _isSaving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.white,
                      ),
                    )
                  : const Text('Enregistrer'),
            ),
            const SizedBox(height: AppSpacing.md),
          ],
        ),
      ),
    );
  }
}
