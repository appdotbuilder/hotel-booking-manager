
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { currencyConversionsTable } from '../db/schema';
import { deleteCurrencyConversion } from '../handlers/delete_currency_conversion';
import { eq } from 'drizzle-orm';

describe('deleteCurrencyConversion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing currency conversion', async () => {
    // Create a test currency conversion
    const testCurrency = await db.insert(currencyConversionsTable)
      .values({
        currency_name: 'USD',
        conversion_rate: '3.75'
      })
      .returning()
      .execute();

    const currencyId = testCurrency[0].id;

    // Delete the currency conversion
    const result = await deleteCurrencyConversion(currencyId);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify the currency conversion is actually deleted
    const deletedCurrency = await db.select()
      .from(currencyConversionsTable)
      .where(eq(currencyConversionsTable.id, currencyId))
      .execute();

    expect(deletedCurrency).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent currency conversion', async () => {
    const nonExistentId = 99999;

    const result = await deleteCurrencyConversion(nonExistentId);

    // Should return false when no rows were deleted
    expect(result).toBe(false);
  });

  it('should not affect other currency conversions when deleting one', async () => {
    // Create multiple test currency conversions
    const testCurrencies = await db.insert(currencyConversionsTable)
      .values([
        {
          currency_name: 'USD',
          conversion_rate: '3.75'
        },
        {
          currency_name: 'EUR',
          conversion_rate: '4.10'
        },
        {
          currency_name: 'IDR',
          conversion_rate: '0.00025'
        }
      ])
      .returning()
      .execute();

    const currencyToDelete = testCurrencies[1].id; // Delete EUR

    // Delete one currency conversion
    const result = await deleteCurrencyConversion(currencyToDelete);

    expect(result).toBe(true);

    // Verify only the targeted currency was deleted
    const remainingCurrencies = await db.select()
      .from(currencyConversionsTable)
      .execute();

    expect(remainingCurrencies).toHaveLength(2);
    
    // Verify the correct currencies remain
    const remainingNames = remainingCurrencies.map(c => c.currency_name).sort();
    expect(remainingNames).toEqual(['IDR', 'USD']);

    // Verify deleted currency is gone
    const deletedCurrency = await db.select()
      .from(currencyConversionsTable)
      .where(eq(currencyConversionsTable.id, currencyToDelete))
      .execute();

    expect(deletedCurrency).toHaveLength(0);
  });

  it('should handle deletion with various conversion rates', async () => {
    // Create currency conversions with different rate formats
    const testCurrencies = await db.insert(currencyConversionsTable)
      .values([
        {
          currency_name: 'JPY',
          conversion_rate: '0.0250'
        },
        {
          currency_name: 'GBP',
          conversion_rate: '4.8750'
        }
      ])
      .returning()
      .execute();

    // Delete first currency
    const result1 = await deleteCurrencyConversion(testCurrencies[0].id);
    expect(result1).toBe(true);

    // Delete second currency
    const result2 = await deleteCurrencyConversion(testCurrencies[1].id);
    expect(result2).toBe(true);

    // Verify all are deleted
    const remainingCurrencies = await db.select()
      .from(currencyConversionsTable)
      .execute();

    expect(remainingCurrencies).toHaveLength(0);
  });
});
