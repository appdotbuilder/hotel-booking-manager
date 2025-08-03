
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { currencyConversionsTable } from '../db/schema';
import { type UpdateCurrencyConversionInput, type CreateCurrencyConversionInput } from '../schema';
import { updateCurrencyConversion } from '../handlers/update_currency_conversion';
import { eq } from 'drizzle-orm';

// Helper to create test currency conversion
const createTestCurrencyConversion = async (input: CreateCurrencyConversionInput) => {
  const result = await db.insert(currencyConversionsTable)
    .values({
      currency_name: input.currency_name,
      conversion_rate: input.conversion_rate.toString()
    })
    .returning()
    .execute();

  return {
    ...result[0],
    conversion_rate: parseFloat(result[0].conversion_rate)
  };
};

describe('updateCurrencyConversion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update currency name only', async () => {
    // Create test currency conversion
    const testCurrency = await createTestCurrencyConversion({
      currency_name: 'USD',
      conversion_rate: 3.75
    });

    const updateInput: UpdateCurrencyConversionInput = {
      id: testCurrency.id,
      currency_name: 'EUR'
    };

    const result = await updateCurrencyConversion(updateInput);

    // Basic field validation
    expect(result.id).toEqual(testCurrency.id);
    expect(result.currency_name).toEqual('EUR');
    expect(result.conversion_rate).toEqual(3.75); // Should remain unchanged
    expect(result.created_at).toEqual(testCurrency.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testCurrency.updated_at.getTime());
  });

  it('should update conversion rate only', async () => {
    // Create test currency conversion
    const testCurrency = await createTestCurrencyConversion({
      currency_name: 'USD',
      conversion_rate: 3.75
    });

    const updateInput: UpdateCurrencyConversionInput = {
      id: testCurrency.id,
      conversion_rate: 4.25
    };

    const result = await updateCurrencyConversion(updateInput);

    // Basic field validation
    expect(result.id).toEqual(testCurrency.id);
    expect(result.currency_name).toEqual('USD'); // Should remain unchanged
    expect(result.conversion_rate).toEqual(4.25);
    expect(typeof result.conversion_rate).toBe('number');
    expect(result.created_at).toEqual(testCurrency.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both currency name and conversion rate', async () => {
    // Create test currency conversion
    const testCurrency = await createTestCurrencyConversion({
      currency_name: 'USD',
      conversion_rate: 3.75
    });

    const updateInput: UpdateCurrencyConversionInput = {
      id: testCurrency.id,
      currency_name: 'GBP',
      conversion_rate: 5.15
    };

    const result = await updateCurrencyConversion(updateInput);

    // Basic field validation
    expect(result.id).toEqual(testCurrency.id);
    expect(result.currency_name).toEqual('GBP');
    expect(result.conversion_rate).toEqual(5.15);
    expect(typeof result.conversion_rate).toBe('number');
    expect(result.created_at).toEqual(testCurrency.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated currency conversion to database', async () => {
    // Create test currency conversion
    const testCurrency = await createTestCurrencyConversion({
      currency_name: 'USD',
      conversion_rate: 3.75
    });

    const updateInput: UpdateCurrencyConversionInput = {
      id: testCurrency.id,
      currency_name: 'JPY',
      conversion_rate: 0.025
    };

    const result = await updateCurrencyConversion(updateInput);

    // Query database to verify update
    const currencies = await db.select()
      .from(currencyConversionsTable)
      .where(eq(currencyConversionsTable.id, result.id))
      .execute();

    expect(currencies).toHaveLength(1);
    expect(currencies[0].currency_name).toEqual('JPY');
    expect(parseFloat(currencies[0].conversion_rate)).toEqual(0.025);
    expect(currencies[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent currency conversion', async () => {
    const updateInput: UpdateCurrencyConversionInput = {
      id: 99999,
      currency_name: 'EUR'
    };

    await expect(updateCurrencyConversion(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle decimal conversion rates correctly', async () => {
    // Create test currency conversion
    const testCurrency = await createTestCurrencyConversion({
      currency_name: 'BTC',
      conversion_rate: 150000.5678
    });

    const updateInput: UpdateCurrencyConversionInput = {
      id: testCurrency.id,
      conversion_rate: 175250.9999
    };

    const result = await updateCurrencyConversion(updateInput);

    // Verify numeric precision is maintained
    expect(result.conversion_rate).toEqual(175250.9999);
    expect(typeof result.conversion_rate).toBe('number');

    // Verify in database
    const currencies = await db.select()
      .from(currencyConversionsTable)
      .where(eq(currencyConversionsTable.id, result.id))
      .execute();

    expect(parseFloat(currencies[0].conversion_rate)).toEqual(175250.9999);
  });
});
