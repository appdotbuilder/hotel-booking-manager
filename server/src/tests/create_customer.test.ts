
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateCustomerInput = {
  name: 'John Doe',
  address: '123 Main Street, Riyadh, Saudi Arabia',
  phone: '+966501234567',
  email: 'john.doe@example.com'
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer', async () => {
    const result = await createCustomer(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.address).toEqual(testInput.address);
    expect(result.phone).toEqual('+966501234567');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInput);

    // Query using proper drizzle syntax
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('John Doe');
    expect(customers[0].address).toEqual(testInput.address);
    expect(customers[0].phone).toEqual('+966501234567');
    expect(customers[0].email).toEqual('john.doe@example.com');
    expect(customers[0].created_at).toBeInstanceOf(Date);
    expect(customers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle different customer data correctly', async () => {
    const arabicCustomer: CreateCustomerInput = {
      name: 'أحمد محمد',
      address: 'الرياض، المملكة العربية السعودية',
      phone: '+966512345678',
      email: 'ahmed.mohammed@example.sa'
    };

    const result = await createCustomer(arabicCustomer);

    expect(result.name).toEqual('أحمد محمد');
    expect(result.address).toEqual('الرياض، المملكة العربية السعودية');
    expect(result.phone).toEqual('+966512345678');
    expect(result.email).toEqual('ahmed.mohammed@example.sa');
    expect(result.id).toBeDefined();
  });

  it('should create multiple customers with unique IDs', async () => {
    const customer1 = await createCustomer(testInput);
    
    const secondInput: CreateCustomerInput = {
      name: 'Jane Smith',
      address: '456 Oak Avenue, Jeddah, Saudi Arabia',
      phone: '+966509876543',
      email: 'jane.smith@example.com'
    };
    
    const customer2 = await createCustomer(secondInput);

    expect(customer1.id).not.toEqual(customer2.id);
    expect(customer1.name).toEqual('John Doe');
    expect(customer2.name).toEqual('Jane Smith');
    
    // Verify both customers exist in database
    const allCustomers = await db.select()
      .from(customersTable)
      .execute();

    expect(allCustomers).toHaveLength(2);
  });
});
