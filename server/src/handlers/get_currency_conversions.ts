
import { db } from '../db';
import { currencyConversionsTable } from '../db/schema';
import { type CurrencyConversion } from '../schema';

export const getCurrencyConversions = async (): Promise<CurrencyConversion[]> => {
  try {
    const results = await db.select()
      .from(currencyConversionsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(conversion => ({
      ...conversion,
      conversion_rate: parseFloat(conversion.conversion_rate)
    }));
  } catch (error) {
    console.error('Failed to fetch currency conversions:', error);
    throw error;
  }
};
