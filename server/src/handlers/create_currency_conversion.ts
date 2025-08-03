
import { db } from '../db';
import { currencyConversionsTable } from '../db/schema';
import { type CreateCurrencyConversionInput, type CurrencyConversion } from '../schema';

export const createCurrencyConversion = async (input: CreateCurrencyConversionInput): Promise<CurrencyConversion> => {
  try {
    // Insert currency conversion record
    const result = await db.insert(currencyConversionsTable)
      .values({
        currency_name: input.currency_name,
        conversion_rate: input.conversion_rate.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const currencyConversion = result[0];
    return {
      ...currencyConversion,
      conversion_rate: parseFloat(currencyConversion.conversion_rate) // Convert string back to number
    };
  } catch (error) {
    console.error('Currency conversion creation failed:', error);
    throw error;
  }
};
