
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { expensesTable, customersTable, hotelsTable, bookingsTable } from '../db/schema';
import { type CreateExpenseInput } from '../schema';
import { getExpenses } from '../handlers/get_expenses';

describe('getExpenses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no expenses exist', async () => {
    const result = await getExpenses();
    expect(result).toEqual([]);
  });

  it('should fetch all expenses', async () => {
    // Create test data
    await db.insert(expensesTable).values([
      {
        name: 'Office Supplies',
        amount: '150.50'
      },
      {
        name: 'Transportation',
        amount: '75.25'
      }
    ]).execute();

    const result = await getExpenses();

    expect(result).toHaveLength(2);
    
    // Verify first expense
    expect(result[0].name).toEqual('Office Supplies');
    expect(result[0].amount).toEqual(150.50);
    expect(typeof result[0].amount).toEqual('number');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    expect(result[0].booking_id).toBeNull();

    // Verify second expense
    expect(result[1].name).toEqual('Transportation');
    expect(result[1].amount).toEqual(75.25);
    expect(typeof result[1].amount).toEqual('number');
    expect(result[1].id).toBeDefined();
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[1].updated_at).toBeInstanceOf(Date);
    expect(result[1].booking_id).toBeNull();
  });

  it('should fetch expenses with booking associations', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable).values({
      name: 'Test Customer',
      address: '123 Test St',
      phone: '123-456-7890',
      email: 'test@example.com'
    }).returning().execute();

    const hotelResult = await db.insert(hotelsTable).values({
      name: 'Test Hotel',
      location: 'Test City',
      room_type: 'Double',
      meal_package: 'Full Board',
      cost_price: '100.00',
      markup_percentage: '20.00',
      selling_price: '120.00'
    }).returning().execute();

    const bookingResult = await db.insert(bookingsTable).values({
      invoice_number: 'INV-001',
      customer_id: customerResult[0].id,
      hotel_id: hotelResult[0].id,
      check_in_date: new Date('2024-01-15'),
      check_out_date: new Date('2024-01-20'),
      room_quantity: 2,
      hotel_subtotal: '240.00',
      services_total: '0.00',
      total_amount: '240.00'
    }).returning().execute();

    // Create expense with booking association
    await db.insert(expensesTable).values({
      booking_id: bookingResult[0].id,
      name: 'Booking Related Expense',
      amount: '200.00'
    }).execute();

    const result = await getExpenses();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Booking Related Expense');
    expect(result[0].amount).toEqual(200.00);
    expect(typeof result[0].amount).toEqual('number');
    expect(result[0].booking_id).toEqual(bookingResult[0].id);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle mixed expenses with and without booking associations', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable).values({
      name: 'Test Customer',
      address: '123 Test St',
      phone: '123-456-7890',
      email: 'test@example.com'
    }).returning().execute();

    const hotelResult = await db.insert(hotelsTable).values({
      name: 'Test Hotel',
      location: 'Test City',
      room_type: 'Double',
      meal_package: 'Full Board',
      cost_price: '100.00',
      markup_percentage: '20.00',
      selling_price: '120.00'
    }).returning().execute();

    const bookingResult = await db.insert(bookingsTable).values({
      invoice_number: 'INV-001',
      customer_id: customerResult[0].id,
      hotel_id: hotelResult[0].id,
      check_in_date: new Date('2024-01-15'),
      check_out_date: new Date('2024-01-20'),
      room_quantity: 2,
      hotel_subtotal: '240.00',
      services_total: '0.00',
      total_amount: '240.00'
    }).returning().execute();

    // Create expenses - one with booking, one without
    await db.insert(expensesTable).values([
      {
        name: 'General Office Expense',
        amount: '100.00'
      },
      {
        booking_id: bookingResult[0].id,
        name: 'Booking Specific Expense',
        amount: '50.00'
      }
    ]).execute();

    const result = await getExpenses();

    expect(result).toHaveLength(2);

    // Find expenses by name to handle potential ordering differences
    const generalExpense = result.find(e => e.name === 'General Office Expense');
    const bookingExpense = result.find(e => e.name === 'Booking Specific Expense');

    expect(generalExpense).toBeDefined();
    expect(generalExpense!.amount).toEqual(100.00);
    expect(generalExpense!.booking_id).toBeNull();

    expect(bookingExpense).toBeDefined();
    expect(bookingExpense!.amount).toEqual(50.00);
    expect(bookingExpense!.booking_id).toEqual(bookingResult[0].id);
  });
});
