
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type Customer } from '../schema';
import { eq } from 'drizzle-orm';

export const getCustomer = async (id: number): Promise<Customer | null> => {
  try {
    const results = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const customer = results[0];
    return {
      ...customer,
      // No numeric conversions needed - all fields are already correct types
    };
  } catch (error) {
    console.error('Get customer failed:', error);
    throw error;
  }
};
