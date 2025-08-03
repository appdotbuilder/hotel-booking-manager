
import { db } from '../db';
import { expensesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateExpenseInput, type Expense } from '../schema';

export async function updateExpense(input: UpdateExpenseInput): Promise<Expense> {
  try {
    // Check if expense exists
    const existingExpense = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, input.id))
      .execute();

    if (existingExpense.length === 0) {
      throw new Error(`Expense with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.booking_id !== undefined) {
      updateData.booking_id = input.booking_id;
    }
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.amount !== undefined) {
      updateData.amount = input.amount.toString(); // Convert number to string for numeric column
    }

    updateData.updated_at = new Date();

    // Update expense record
    const result = await db.update(expensesTable)
      .set(updateData)
      .where(eq(expensesTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const expense = result[0];
    return {
      ...expense,
      amount: parseFloat(expense.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Expense update failed:', error);
    throw error;
  }
}
