
import { db } from '../db';
import { currencyConversionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteCurrencyConversion = async (id: number): Promise<boolean> => {
  try {
    const result = await db.delete(currencyConversionsTable)
      .where(eq(currencyConversionsTable.id, id))
      .execute();

    // Return true if at least one row was deleted
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Currency conversion deletion failed:', error);
    throw error;
  }
};
