// =============================================================================
// Store Approval Configuration
// =============================================================================
// Fields that require admin approval when changed (ADR-018)
// Immutable fields that can never be changed after creation
// =============================================================================

export const FIELDS_REQUIRING_APPROVAL = [
  'name',
  'description',
  'type',
  'address',
  'city',
  'postalCode',
  'latitude',
  'longitude',
  'phone',
  'foodLicence',
] as const;

export const IMMUTABLE_FIELDS = ['brn', 'id', 'partnerId', 'createdAt'] as const;

export type ApprovalRequiredField = (typeof FIELDS_REQUIRING_APPROVAL)[number];
export type ImmutableField = (typeof IMMUTABLE_FIELDS)[number];
