
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { expensesTable, bookingsTable, customersTable, hotelsTable } from '../db/schema';
import { type CreateExpenseInput, type CreateBookingInput, type CreateCustomerInput, type CreateHotelInput } from '../schema';
import { deleteExpense } from '../handlers/delete_expense';
import { eq } from 'drizzle-orm';

// Test customer data
const testCustomer: CreateCustomerInput = {
  name: 'Test Customer',
  address: '123 Test St',
  phone: '+1234567890',
  email: 'test@example.com'
};

// Test hotel data
const testHotel: CreateHotelInput = {
  name: 'Test Hotel',
  location: 'Test City',
  room_type: 'Double',
  meal_package: 'Full Board',
  cost_price: 100.00,
  markup_percentage: 20.00
};

// Test booking data
const testBooking: CreateBookingInput = {
  customer_id: 1,
  hotel_id: 1,
  check_in_date: '2024-01-01',
  check_out_date: '2024-01-03',
  room_quantity: 2
};

// Test expense data
const testExpense: CreateExpenseInput = {
  booking_id: 1,
  name: 'Test Expense',
  amount: 50.00
};

const testExpenseWithoutBooking: CreateExpenseInput = {
  name: 'General Expense',
  amount: 75.00
};

describe('deleteExpense', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing expense', async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    const hotel = await db.insert(hotelsTable)
      .values({
        ...testHotel,
        cost_price: testHotel.cost_price.toString(),
        markup_percentage: testHotel.markup_percentage.toString(),
        selling_price: (testHotel.cost_price * (1 + testHotel.markup_percentage / 100)).toString()
      })
      .returning()
      .execute();

    const booking = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-001',
        customer_id: customer[0].id,
        hotel_id: hotel[0].id,
        check_in_date: new Date(testBooking.check_in_date),
        check_out_date: new Date(testBooking.check_out_date),
        room_quantity: testBooking.room_quantity,
        hotel_subtotal: '200.00',
        services_total: '0.00',
        total_amount: '200.00'
      })
      .returning()
      .execute();

    // Create expense
    const expense = await db.insert(expensesTable)
      .values({
        booking_id: booking[0].id,
        name: testExpense.name,
        amount: testExpense.amount.toString()
      })
      .returning()
      .execute();

    const result = await deleteExpense(expense[0].id);

    expect(result).toBe(true);

    // Verify expense was deleted
    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, expense[0].id))
      .execute();

    expect(expenses).toHaveLength(0);
  });

  it('should delete expense without booking relation', async () => {
    // Create expense without booking
    const expense = await db.insert(expensesTable)
      .values({
        booking_id: null,
        name: testExpenseWithoutBooking.name,
        amount: testExpenseWithoutBooking.amount.toString()
      })
      .returning()
      .execute();

    const result = await deleteExpense(expense[0].id);

    expect(result).toBe(true);

    // Verify expense was deleted
    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, expense[0].id))
      .execute();

    expect(expenses).toHaveLength(0);
  });

  it('should return false when deleting non-existent expense', async () => {
    const nonExistentId = 999;

    const result = await deleteExpense(nonExistentId);

    expect(result).toBe(false);
  });

  it('should handle multiple deletions correctly', async () => {
    // Create multiple expenses
    const expense1 = await db.insert(expensesTable)
      .values({
        booking_id: null,
        name: 'Expense 1',
        amount: '25.00'
      })
      .returning()
      .execute();

    const expense2 = await db.insert(expensesTable)
      .values({
        booking_id: null,
        name: 'Expense 2',
        amount: '35.00'
      })
      .returning()
      .execute();

    // Delete first expense
    const result1 = await deleteExpense(expense1[0].id);
    expect(result1).toBe(true);

    // Delete second expense
    const result2 = await deleteExpense(expense2[0].id);
    expect(result2).toBe(true);

    // Verify both are deleted
    const remainingExpenses = await db.select()
      .from(expensesTable)
      .execute();

    expect(remainingExpenses).toHaveLength(0);
  });
});
