
import { db } from '../db';
import { currencyConversionsTable } from '../db/schema';
import { type UpdateCurrencyConversionInput, type CurrencyConversion } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCurrencyConversion = async (input: UpdateCurrencyConversionInput): Promise<CurrencyConversion> => {
  try {
    // Build update values object dynamically
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.currency_name !== undefined) {
      updateValues.currency_name = input.currency_name;
    }

    if (input.conversion_rate !== undefined) {
      updateValues.conversion_rate = input.conversion_rate.toString(); // Convert number to string for numeric column
    }

    // Update currency conversion record
    const result = await db.update(currencyConversionsTable)
      .set(updateValues)
      .where(eq(currencyConversionsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Currency conversion with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const currencyConversion = result[0];
    return {
      ...currencyConversion,
      conversion_rate: parseFloat(currencyConversion.conversion_rate) // Convert string back to number
    };
  } catch (error) {
    console.error('Currency conversion update failed:', error);
    throw error;
  }
};
