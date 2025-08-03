
import { db } from '../db';
import { expensesTable } from '../db/schema';
import { type Expense } from '../schema';

export const getExpenses = async (): Promise<Expense[]> => {
  try {
    const results = await db.select()
      .from(expensesTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(expense => ({
      ...expense,
      amount: parseFloat(expense.amount)
    }));
  } catch (error) {
    console.error('Fetching expenses failed:', error);
    throw error;
  }
};
