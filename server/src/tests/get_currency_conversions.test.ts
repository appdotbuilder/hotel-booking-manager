
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { currencyConversionsTable } from '../db/schema';
import { getCurrencyConversions } from '../handlers/get_currency_conversions';

describe('getCurrencyConversions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no currency conversions exist', async () => {
    const result = await getCurrencyConversions();
    expect(result).toEqual([]);
  });

  it('should return all currency conversions', async () => {
    // Create test data
    await db.insert(currencyConversionsTable).values([
      {
        currency_name: 'USD',
        conversion_rate: '3.75'
      },
      {
        currency_name: 'IDR', 
        conversion_rate: '0.0003'
      },
      {
        currency_name: 'EUR',
        conversion_rate: '4.12'
      }
    ]).execute();

    const result = await getCurrencyConversions();

    expect(result).toHaveLength(3);
    
    // Verify first conversion
    const usdConversion = result.find(c => c.currency_name === 'USD');
    expect(usdConversion).toBeDefined();
    expect(usdConversion!.currency_name).toBe('USD');
    expect(usdConversion!.conversion_rate).toBe(3.75);
    expect(typeof usdConversion!.conversion_rate).toBe('number');
    expect(usdConversion!.id).toBeDefined();
    expect(usdConversion!.created_at).toBeInstanceOf(Date);
    expect(usdConversion!.updated_at).toBeInstanceOf(Date);

    // Verify second conversion
    const idrConversion = result.find(c => c.currency_name === 'IDR');
    expect(idrConversion).toBeDefined();
    expect(idrConversion!.currency_name).toBe('IDR');
    expect(idrConversion!.conversion_rate).toBe(0.0003);
    expect(typeof idrConversion!.conversion_rate).toBe('number');

    // Verify third conversion
    const eurConversion = result.find(c => c.currency_name === 'EUR');
    expect(eurConversion).toBeDefined();
    expect(eurConversion!.currency_name).toBe('EUR');
    expect(eurConversion!.conversion_rate).toBe(4.12);
    expect(typeof eurConversion!.conversion_rate).toBe('number');
  });

  it('should handle precision correctly for small conversion rates', async () => {
    // Test with very small conversion rate
    await db.insert(currencyConversionsTable).values({
      currency_name: 'Japanese Yen',
      conversion_rate: '0.0275'
    }).execute();

    const result = await getCurrencyConversions();

    expect(result).toHaveLength(1);
    expect(result[0].currency_name).toBe('Japanese Yen');
    expect(result[0].conversion_rate).toBe(0.0275);
    expect(typeof result[0].conversion_rate).toBe('number');
  });
});
