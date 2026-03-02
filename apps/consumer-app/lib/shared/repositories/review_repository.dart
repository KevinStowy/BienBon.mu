import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers/api_provider.dart';

/// Review data model.
class Review {
  const Review({
    required this.id,
    required this.consumerId,
    required this.consumerName,
    required this.storeId,
    required this.reservationId,
    required this.rating,
    this.comment,
    required this.createdAt,
  });

  final String id;
  final String consumerId;
  final String consumerName;
  final String storeId;
  final String reservationId;
  final int rating;
  final String? comment;
  final DateTime createdAt;

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['id'] as String,
      consumerId: json['consumerId'] as String? ?? '',
      consumerName: json['consumerName'] as String? ?? '',
      storeId: json['storeId'] as String? ?? '',
      reservationId: json['reservationId'] as String? ?? '',
      rating: json['rating'] as int? ?? 0,
      comment: json['comment'] as String?,
      createdAt: DateTime.parse(
          json['createdAt'] as String? ?? DateTime.now().toIso8601String()),
    );
  }
}

/// Repository for review operations.
class ReviewRepository {
  ReviewRepository(this._api);
  final ApiClient _api;

  Future<List<Review>> getStoreReviews(String storeId) async {
    final data = await _api.get('/api/stores/$storeId/reviews');
    if (data is List) {
      return data
          .map((e) => Review.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => Review.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<Review> submitReview({
    required String reservationId,
    required int rating,
    String? comment,
  }) async {
    final data = await _api.post('/api/reviews', body: {
      'reservationId': reservationId,
      'rating': rating,
      if (comment != null && comment.isNotEmpty) 'comment': comment,
    });
    return Review.fromJson(data as Map<String, dynamic>);
  }
}

final reviewRepositoryProvider = Provider<ReviewRepository>((ref) {
  return ReviewRepository(ref.watch(apiClientProvider));
});
