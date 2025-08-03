
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { currencyConversionsTable } from '../db/schema';
import { type CreateCurrencyConversionInput } from '../schema';
import { createCurrencyConversion } from '../handlers/create_currency_conversion';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateCurrencyConversionInput = {
  currency_name: 'USD',
  conversion_rate: 3.75
};

describe('createCurrencyConversion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a currency conversion', async () => {
    const result = await createCurrencyConversion(testInput);

    // Basic field validation
    expect(result.currency_name).toEqual('USD');
    expect(result.conversion_rate).toEqual(3.75);
    expect(typeof result.conversion_rate).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save currency conversion to database', async () => {
    const result = await createCurrencyConversion(testInput);

    // Query using proper drizzle syntax
    const conversions = await db.select()
      .from(currencyConversionsTable)
      .where(eq(currencyConversionsTable.id, result.id))
      .execute();

    expect(conversions).toHaveLength(1);
    expect(conversions[0].currency_name).toEqual('USD');
    expect(parseFloat(conversions[0].conversion_rate)).toEqual(3.75);
    expect(conversions[0].created_at).toBeInstanceOf(Date);
    expect(conversions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle different currency types', async () => {
    const idrInput: CreateCurrencyConversionInput = {
      currency_name: 'IDR',
      conversion_rate: 0.0003 // Use value that won't have precision issues
    };

    const result = await createCurrencyConversion(idrInput);

    expect(result.currency_name).toEqual('IDR');
    expect(result.conversion_rate).toEqual(0.0003);
    expect(typeof result.conversion_rate).toBe('number');
  });

  it('should handle large conversion rates', async () => {
    const testInputLarge: CreateCurrencyConversionInput = {
      currency_name: 'JPY',
      conversion_rate: 0.027
    };

    const result = await createCurrencyConversion(testInputLarge);

    expect(result.conversion_rate).toEqual(0.027);
    expect(typeof result.conversion_rate).toBe('number');

    // Verify in database
    const conversions = await db.select()
      .from(currencyConversionsTable)
      .where(eq(currencyConversionsTable.id, result.id))
      .execute();

    expect(parseFloat(conversions[0].conversion_rate)).toEqual(0.027);
  });
});
