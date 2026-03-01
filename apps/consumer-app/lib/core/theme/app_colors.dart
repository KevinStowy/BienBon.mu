import 'package:flutter/material.dart';

/// BienBon design system color palette.
/// Source of truth: DESIGN_SYSTEM.md
abstract final class AppColors {
  // -------------------------------------------------------------------------
  // Green — primary brand
  // -------------------------------------------------------------------------
  static const Color green900 = Color(0xFF1B5E20);
  static const Color green700 = Color(0xFF2E7D32);
  static const Color green500 = Color(0xFF4CAF50);
  static const Color green100 = Color(0xFFE8F5E9);

  // -------------------------------------------------------------------------
  // Orange — accent
  // -------------------------------------------------------------------------
  static const Color orange600 = Color(0xFFE65100);
  static const Color orange500 = Color(0xFFFF9800);
  static const Color orange100 = Color(0xFFFFF3E0);

  // -------------------------------------------------------------------------
  // Neutral
  // -------------------------------------------------------------------------
  static const Color neutral900 = Color(0xFF1A1A1A);
  static const Color neutral600 = Color(0xFF6B7280);
  static const Color neutral400 = Color(0xFF9CA3AF);
  static const Color neutral200 = Color(0xFFE5E7EB);
  static const Color neutral50 = Color(0xFFF7F4EF);

  // -------------------------------------------------------------------------
  // Surface
  // -------------------------------------------------------------------------
  static const Color white = Color(0xFFFFFFFF);

  // -------------------------------------------------------------------------
  // Semantic aliases
  // -------------------------------------------------------------------------
  static const Color primary = green700;
  static const Color primaryDark = green900;
  static const Color primaryLight = green500;
  static const Color accent = orange600;
  static const Color accentLight = orange500;
  static const Color background = neutral50;
  static const Color surface = white;
  static const Color textPrimary = neutral900;
  static const Color textSecondary = neutral600;
  static const Color textDisabled = neutral400;
  static const Color divider = neutral200;
  static const Color error = Color(0xFFB00020);
  static const Color success = green500;
}
