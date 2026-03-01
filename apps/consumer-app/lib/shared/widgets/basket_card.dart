import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';

/// Card widget representing a surprise basket.
/// Displays store name, basket name, pricing and pickup window.
class BasketCard extends StatelessWidget {
  const BasketCard({
    super.key,
    required this.basketId,
    required this.basketName,
    required this.storeName,
    required this.originalPrice,
    required this.discountedPrice,
    required this.pickupWindow,
    this.remainingCount,
    this.imageUrl,
    this.onTap,
  });

  final String basketId;
  final String basketName;
  final String storeName;
  final double originalPrice;
  final double discountedPrice;
  final String pickupWindow;
  final int? remainingCount;
  final String? imageUrl;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final discountPercent =
        ((1 - discountedPrice / originalPrice) * 100).round();

    return Semantics(
      button: true,
      label:
          '$basketName de $storeName, prix reduit a ${discountedPrice.toStringAsFixed(2)} MUR, retrait $pickupWindow',
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 200,
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(AppRadius.card),
            boxShadow: AppShadow.sm,
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image
              Stack(
                children: [
                  Container(
                    height: 120,
                    color: AppColors.green100,
                    child: imageUrl != null
                        ? Image.network(
                            imageUrl!,
                            fit: BoxFit.cover,
                            width: double.infinity,
                            height: 120,
                            errorBuilder: (context, error, stack) =>
                                _PlaceholderImage(storeName: storeName),
                          )
                        : _PlaceholderImage(storeName: storeName),
                  ),
                  // Discount badge
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.orange600,
                        borderRadius: BorderRadius.circular(AppRadius.chip),
                      ),
                      child: Text(
                        '-$discountPercent%',
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: AppColors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  // Remaining count badge
                  if (remainingCount != null)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: remainingCount! <= 3
                              ? AppColors.orange600
                              : AppColors.green700,
                          borderRadius:
                              BorderRadius.circular(AppRadius.chip),
                        ),
                        child: Text(
                          'Reste $remainingCount',
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: AppColors.white,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              // Content
              Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      storeName,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      basketName,
                      style: theme.textTheme.headlineMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    // Prices
                    Row(
                      children: [
                        Text(
                          '${discountedPrice.toStringAsFixed(0)} MUR',
                          style: theme.textTheme.headlineMedium?.copyWith(
                            color: AppColors.green700,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          '${originalPrice.toStringAsFixed(0)} MUR',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            decoration: TextDecoration.lineThrough,
                            color: AppColors.textDisabled,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    // Pickup window chip
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.orange100,
                        borderRadius: BorderRadius.circular(AppRadius.chip),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.access_time,
                            size: 12,
                            color: AppColors.orange600,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            pickupWindow,
                            style: theme.textTheme.labelLarge?.copyWith(
                              color: AppColors.orange600,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlaceholderImage extends StatelessWidget {
  const _PlaceholderImage({required this.storeName});

  final String storeName;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 120,
      width: double.infinity,
      color: AppColors.green100,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.shopping_basket, size: 40, color: AppColors.green700),
          const SizedBox(height: 4),
          Text(
            storeName,
            style: const TextStyle(
              fontSize: 10,
              color: AppColors.green900,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
