import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import 'status_badge.dart';

/// Data model for a basket (partner view).
class BasketModel {
  const BasketModel({
    required this.id,
    required this.title,
    required this.originalPrice,
    required this.discountedPrice,
    required this.stock,
    required this.totalStock,
    required this.status,
    required this.storeId,
    required this.storeName,
    this.category = '',
    this.pickupStart,
    this.pickupEnd,
  });

  final String id;
  final String title;
  final double originalPrice;
  final double discountedPrice;
  final int stock;
  final int totalStock;
  final BasketStatus status;
  final String storeId;
  final String storeName;
  final String category;
  final DateTime? pickupStart;
  final DateTime? pickupEnd;

  double get discountPercent =>
      originalPrice > 0
          ? ((originalPrice - discountedPrice) / originalPrice * 100)
          : 0;
}

class BasketCardPartner extends StatelessWidget {
  const BasketCardPartner({
    super.key,
    required this.basket,
    this.onTap,
    this.onStatusToggle,
  });

  final BasketModel basket;
  final VoidCallback? onTap;
  final VoidCallback? onStatusToggle;

  @override
  Widget build(BuildContext context) {
    final reservedCount = basket.totalStock - basket.stock;

    return Semantics(
      label: '${basket.title}, stock: ${basket.stock}/${basket.totalStock}',
      button: onTap != null,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.card),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(AppRadius.card),
            boxShadow: AppShadow.sm,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          basket.title,
                          style: Theme.of(context)
                              .textTheme
                              .headlineMedium,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          basket.storeName,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  StatusBadge.basketStatus(basket.status),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              const Divider(),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  _PriceChip(
                    label: 'Rs ${basket.discountedPrice.toStringAsFixed(0)}',
                    color: AppColors.green700,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    'Rs ${basket.originalPrice.toStringAsFixed(0)}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          decoration: TextDecoration.lineThrough,
                        ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _PriceChip(
                    label: '-${basket.discountPercent.toStringAsFixed(0)}%',
                    color: AppColors.orange600,
                    background: AppColors.orange100,
                  ),
                  const Spacer(),
                  Row(
                    children: [
                      const Icon(
                        Icons.inventory_2_outlined,
                        size: 14,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${basket.stock} restant(s)',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  const Icon(
                    Icons.people_outline,
                    size: 14,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '$reservedCount reservation(s)',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const Spacer(),
                  if (onStatusToggle != null)
                    Semantics(
                      label: basket.status == BasketStatus.published
                          ? 'Retirer de la vente'
                          : 'Publier le panier',
                      button: true,
                      child: GestureDetector(
                        onTap: onStatusToggle,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: AppSpacing.xs,
                          ),
                          decoration: BoxDecoration(
                            color: basket.status == BasketStatus.published
                                ? AppColors.orange100
                                : AppColors.green100,
                            borderRadius:
                                BorderRadius.circular(AppRadius.chip),
                          ),
                          child: Text(
                            basket.status == BasketStatus.published
                                ? 'Retirer'
                                : 'Publier',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: basket.status == BasketStatus.published
                                  ? AppColors.orange600
                                  : AppColors.green700,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PriceChip extends StatelessWidget {
  const _PriceChip({
    required this.label,
    required this.color,
    this.background,
  });

  final String label;
  final Color color;
  final Color? background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 6,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: background ?? AppColors.green100,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}
