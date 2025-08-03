
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, bookingsTable, hotelsTable } from '../db/schema';
import { deleteCustomer } from '../handlers/delete_customer';
import { eq } from 'drizzle-orm';

describe('deleteCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing customer without bookings', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '123-456-7890',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Delete customer
    const result = await deleteCustomer(customerId);

    expect(result).toBe(true);

    // Verify customer is deleted
    const deletedCustomer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(deletedCustomer).toHaveLength(0);
  });

  it('should return false when customer does not exist', async () => {
    const result = await deleteCustomer(999);

    expect(result).toBe(false);
  });

  it('should throw error when customer has existing bookings', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '123-456-7890',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create test hotel for booking
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

    const hotelId = hotelResult[0].id;

    // Create booking for customer
    await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV001',
        customer_id: customerId,
        hotel_id: hotelId,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-05'),
        room_quantity: 1,
        hotel_subtotal: '120.00',
        services_total: '0.00',
        total_amount: '120.00'
      })
      .execute();

    // Attempt to delete customer with bookings
    await expect(deleteCustomer(customerId)).rejects.toThrow(/cannot delete customer with existing bookings/i);

    // Verify customer still exists
    const existingCustomer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(existingCustomer).toHaveLength(1);
  });

  it('should handle database operation correctly', async () => {
    // Create multiple test customers
    const customer1Result = await db.insert(customersTable)
      .values({
        name: 'Customer 1',
        address: '123 Test St',
        phone: '123-456-7890',
        email: 'customer1@example.com'
      })
      .returning()
      .execute();

    const customer2Result = await db.insert(customersTable)
      .values({
        name: 'Customer 2',
        address: '456 Test Ave',
        phone: '098-765-4321',
        email: 'customer2@example.com'
      })
      .returning()
      .execute();

    const customer1Id = customer1Result[0].id;
    const customer2Id = customer2Result[0].id;

    // Delete one customer
    const result = await deleteCustomer(customer1Id);

    expect(result).toBe(true);

    // Verify only the targeted customer is deleted
    const remainingCustomers = await db.select()
      .from(customersTable)
      .execute();

    expect(remainingCustomers).toHaveLength(1);
    expect(remainingCustomers[0].id).toBe(customer2Id);
    expect(remainingCustomers[0].name).toBe('Customer 2');
  });
});
