
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { expensesTable, customersTable, hotelsTable, bookingsTable } from '../db/schema';
import { type CreateExpenseInput } from '../schema';
import { createExpense } from '../handlers/create_expense';
import { eq } from 'drizzle-orm';

// Test input for standalone expense
const testStandaloneInput: CreateExpenseInput = {
  name: 'Office Supplies',
  amount: 250.75
};

// Test input for booking-linked expense
const testBookingLinkedInput: CreateExpenseInput = {
  booking_id: 1,
  name: 'Transportation Cost',
  amount: 150.50
};

describe('createExpense', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a standalone expense', async () => {
    const result = await createExpense(testStandaloneInput);

    // Basic field validation
    expect(result.name).toEqual('Office Supplies');
    expect(result.amount).toEqual(250.75);
    expect(typeof result.amount).toBe('number');
    expect(result.booking_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a booking-linked expense', async () => {
    // Create prerequisite data: customer, hotel, and booking
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '+1234567890',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const hotelResult = await db.insert(hotelsTable)
      .values({
        name: 'Test Hotel',
        location: 'Test Location',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '100.00',
        markup_percentage: '20.00',
        selling_price: '120.00'
      })
      .returning()
      .execute();

    const bookingResult = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-001',
        customer_id: customerResult[0].id,
        hotel_id: hotelResult[0].id,
        check_in_date: new Date('2024-01-15'),
        check_out_date: new Date('2024-01-20'),
        room_quantity: 2,
        hotel_subtotal: '240.00',
        services_total: '0.00',
        total_amount: '240.00'
      })
      .returning()
      .execute();

    // Create expense linked to booking
    const expenseInput: CreateExpenseInput = {
      booking_id: bookingResult[0].id,
      name: 'Transportation Cost',
      amount: 150.50
    };

    const result = await createExpense(expenseInput);

    // Validate expense fields
    expect(result.name).toEqual('Transportation Cost');
    expect(result.amount).toEqual(150.50);
    expect(typeof result.amount).toBe('number');
    expect(result.booking_id).toEqual(bookingResult[0].id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save expense to database', async () => {
    const result = await createExpense(testStandaloneInput);

    // Query using proper drizzle syntax
    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, result.id))
      .execute();

    expect(expenses).toHaveLength(1);
    expect(expenses[0].name).toEqual('Office Supplies');
    expect(parseFloat(expenses[0].amount)).toEqual(250.75);
    expect(expenses[0].booking_id).toBeNull();
    expect(expenses[0].created_at).toBeInstanceOf(Date);
    expect(expenses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle decimal amounts correctly', async () => {
    const decimalInput: CreateExpenseInput = {
      name: 'Fuel Cost',
      amount: 99.99
    };

    const result = await createExpense(decimalInput);

    expect(result.amount).toEqual(99.99);
    expect(typeof result.amount).toBe('number');

    // Verify in database
    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, result.id))
      .execute();

    expect(parseFloat(expenses[0].amount)).toEqual(99.99);
  });
});
