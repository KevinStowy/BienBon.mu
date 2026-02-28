// =============================================================================
// Review — domain entity
// =============================================================================

export interface Review {
  id: string;
  reservationId: string;
  consumerId: string;
  partnerId: string;
  rating: number;
  comment: string | null;
  editableUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}
