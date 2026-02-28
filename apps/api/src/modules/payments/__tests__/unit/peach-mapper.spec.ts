import { describe, it, expect } from 'vitest';
import {
  classifyPeachResultCode,
  isPeachSuccess,
  isPeachRetryable,
  mapPeachCodeToPaymentStatus,
} from '../../adapters/peach/peach-payments.mapper';
import { PaymentStatus } from '@bienbon/shared-types';

describe('classifyPeachResultCode', () => {
  it('classifies success codes correctly', () => {
    expect(classifyPeachResultCode('000.000.000')).toBe('SUCCESS');
    expect(classifyPeachResultCode('000.100.110')).toBe('SUCCESS');
    expect(classifyPeachResultCode('000.100.111')).toBe('SUCCESS');
  });

  it('classifies pending codes', () => {
    expect(classifyPeachResultCode('000.200.000')).toBe('PENDING');
    expect(classifyPeachResultCode('000.200.100')).toBe('PENDING');
  });

  it('classifies soft decline codes', () => {
    expect(classifyPeachResultCode('800.100.153')).toBe('SOFT_DECLINE');
    expect(classifyPeachResultCode('800.100.100')).toBe('SOFT_DECLINE');
  });

  it('classifies fraud codes', () => {
    expect(classifyPeachResultCode('800.200.300')).toBe('FRAUD');
  });

  it('classifies hard decline codes', () => {
    expect(classifyPeachResultCode('800.300.101')).toBe('HARD_DECLINE');
    expect(classifyPeachResultCode('800.400.200')).toBe('HARD_DECLINE');
  });

  it('classifies communication errors', () => {
    expect(classifyPeachResultCode('900.100.600')).toBe('COMMUNICATION');
  });

  it('returns UNKNOWN for unrecognised codes', () => {
    expect(classifyPeachResultCode('')).toBe('UNKNOWN');
    expect(classifyPeachResultCode('999.999.999')).toBe('UNKNOWN');
  });
});

describe('isPeachSuccess', () => {
  it('returns true for success codes', () => {
    expect(isPeachSuccess('000.100.110')).toBe(true);
  });

  it('returns false for failure codes', () => {
    expect(isPeachSuccess('800.100.153')).toBe(false);
    expect(isPeachSuccess('800.300.101')).toBe(false);
  });

  it('returns false for pending codes', () => {
    expect(isPeachSuccess('000.200.000')).toBe(false);
  });
});

describe('isPeachRetryable', () => {
  it('returns true for soft declines', () => {
    expect(isPeachRetryable('800.100.153')).toBe(true);
  });

  it('returns true for communication errors', () => {
    expect(isPeachRetryable('900.100.600')).toBe(true);
  });

  it('returns false for hard declines', () => {
    expect(isPeachRetryable('800.300.101')).toBe(false);
  });

  it('returns false for success', () => {
    expect(isPeachRetryable('000.100.110')).toBe(false);
  });
});

describe('mapPeachCodeToPaymentStatus', () => {
  it('maps success to SUCCEEDED', () => {
    expect(mapPeachCodeToPaymentStatus('000.100.110')).toBe(PaymentStatus.SUCCEEDED);
  });

  it('maps pending to PROCESSING', () => {
    expect(mapPeachCodeToPaymentStatus('000.200.000')).toBe(PaymentStatus.PROCESSING);
  });

  it('maps failure codes to FAILED', () => {
    expect(mapPeachCodeToPaymentStatus('800.100.153')).toBe(PaymentStatus.FAILED);
    expect(mapPeachCodeToPaymentStatus('800.300.101')).toBe(PaymentStatus.FAILED);
    expect(mapPeachCodeToPaymentStatus('800.200.300')).toBe(PaymentStatus.FAILED);
  });
});
