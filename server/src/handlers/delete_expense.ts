
import { db } from '../db';
import { expensesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteExpense = async (id: number): Promise<boolean> => {
  try {
    const result = await db.delete(expensesTable)
      .where(eq(expensesTable.id, id))
      .execute();

    // Check if any rows were affected (expense existed and was deleted)
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Expense deletion failed:', error);
    throw error;
  }
};
