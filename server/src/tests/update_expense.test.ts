
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { expensesTable, customersTable, hotelsTable, bookingsTable } from '../db/schema';
import { type UpdateExpenseInput } from '../schema';
import { updateExpense } from '../handlers/update_expense';
import { eq } from 'drizzle-orm';

describe('updateExpense', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update expense with all fields', async () => {
    // Create customer
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '1234567890',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create hotel
    const hotel = await db.insert(hotelsTable)
      .values({
        name: 'Test Hotel',
        location: 'Test City',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '100.00',
        markup_percentage: '20.00',
        selling_price: '120.00'
      })
      .returning()
      .execute();

    // Create booking
    const booking = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-001',
        customer_id: customer[0].id,
        hotel_id: hotel[0].id,
        check_in_date: new Date('2024-01-15'),
        check_out_date: new Date('2024-01-20'),
        room_quantity: 2,
        hotel_subtotal: '240.00',
        services_total: '0.00',
        total_amount: '240.00'
      })
      .returning()
      .execute();

    // Create initial expense
    const initialExpense = await db.insert(expensesTable)
      .values({
        booking_id: booking[0].id,
        name: 'Initial Expense',
        amount: '100.00'
      })
      .returning()
      .execute();

    const updateInput: UpdateExpenseInput = {
      id: initialExpense[0].id,
      booking_id: null,
      name: 'Updated Expense',
      amount: 150.50
    };

    const result = await updateExpense(updateInput);

    expect(result.id).toEqual(initialExpense[0].id);
    expect(result.booking_id).toBeNull();
    expect(result.name).toEqual('Updated Expense');
    expect(result.amount).toEqual(150.50);
    expect(typeof result.amount).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    // Create initial expense without booking
    const initialExpense = await db.insert(expensesTable)
      .values({
        booking_id: null,
        name: 'Initial Expense',
        amount: '100.00'
      })
      .returning()
      .execute();

    const updateInput: UpdateExpenseInput = {
      id: initialExpense[0].id,
      name: 'Partially Updated Expense'
    };

    const result = await updateExpense(updateInput);

    expect(result.id).toEqual(initialExpense[0].id);
    expect(result.booking_id).toBeNull(); // Should remain unchanged
    expect(result.name).toEqual('Partially Updated Expense');
    expect(result.amount).toEqual(100); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated expense to database', async () => {
    // Create initial expense
    const initialExpense = await db.insert(expensesTable)
      .values({
        booking_id: null,
        name: 'Initial Expense',
        amount: '100.00'
      })
      .returning()
      .execute();

    const updateInput: UpdateExpenseInput = {
      id: initialExpense[0].id,
      name: 'Database Updated Expense',
      amount: 200.75
    };

    await updateExpense(updateInput);

    // Verify in database
    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, initialExpense[0].id))
      .execute();

    expect(expenses).toHaveLength(1);
    expect(expenses[0].name).toEqual('Database Updated Expense');
    expect(parseFloat(expenses[0].amount)).toEqual(200.75);
    expect(expenses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent expense', async () => {
    const updateInput: UpdateExpenseInput = {
      id: 999,
      name: 'Non-existent Expense'
    };

    expect(updateExpense(updateInput)).rejects.toThrow(/expense with id 999 not found/i);
  });

  it('should update booking_id reference', async () => {
    // Create customer
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '1234567890',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create hotel
    const hotel = await db.insert(hotelsTable)
      .values({
        name: 'Test Hotel',
        location: 'Test City',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '100.00',
        markup_percentage: '20.00',
        selling_price: '120.00'
      })
      .returning()
      .execute();

    // Create booking
    const booking = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-002',
        customer_id: customer[0].id,
        hotel_id: hotel[0].id,
        check_in_date: new Date('2024-01-15'),
        check_out_date: new Date('2024-01-20'),
        room_quantity: 2,
        hotel_subtotal: '240.00',
        services_total: '0.00',
        total_amount: '240.00'
      })
      .returning()
      .execute();

    // Create initial expense without booking
    const initialExpense = await db.insert(expensesTable)
      .values({
        booking_id: null,
        name: 'Expense to be linked',
        amount: '75.00'
      })
      .returning()
      .execute();

    const updateInput: UpdateExpenseInput = {
      id: initialExpense[0].id,
      booking_id: booking[0].id
    };

    const result = await updateExpense(updateInput);

    expect(result.booking_id).toEqual(booking[0].id);
    expect(result.name).toEqual('Expense to be linked'); // Should remain unchanged
    expect(result.amount).toEqual(75); // Should remain unchanged
  });

  it('should handle foreign key constraint with invalid booking_id', async () => {
    // Create initial expense
    const initialExpense = await db.insert(expensesTable)
      .values({
        booking_id: null,
        name: 'Test Expense',
        amount: '50.00'
      })
      .returning()
      .execute();

    const updateInput: UpdateExpenseInput = {
      id: initialExpense[0].id,
      booking_id: 999 // Non-existent booking
    };

    expect(updateExpense(updateInput)).rejects.toThrow();
  });
});
