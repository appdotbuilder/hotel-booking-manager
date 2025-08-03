
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { getCustomers } from '../handlers/get_customers';

// Test customer data
const testCustomer1: CreateCustomerInput = {
  name: 'John Doe',
  address: '123 Main St, Riyadh',
  phone: '+966501234567',
  email: 'john.doe@example.com'
};

const testCustomer2: CreateCustomerInput = {
  name: 'Jane Smith',
  address: '456 Oak Ave, Jeddah',
  phone: '+966507654321',
  email: 'jane.smith@example.com'
};

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers exist', async () => {
    const result = await getCustomers();

    expect(result).toEqual([]);
  });

  it('should return all customers', async () => {
    // Create test customers
    await db.insert(customersTable)
      .values([testCustomer1, testCustomer2])
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(2);
    
    // Verify first customer
    const customer1 = result.find(c => c.name === 'John Doe');
    expect(customer1).toBeDefined();
    expect(customer1!.address).toEqual('123 Main St, Riyadh');
    expect(customer1!.phone).toEqual('+966501234567');
    expect(customer1!.email).toEqual('john.doe@example.com');
    expect(customer1!.id).toBeDefined();
    expect(customer1!.created_at).toBeInstanceOf(Date);
    expect(customer1!.updated_at).toBeInstanceOf(Date);

    // Verify second customer
    const customer2 = result.find(c => c.name === 'Jane Smith');
    expect(customer2).toBeDefined();
    expect(customer2!.address).toEqual('456 Oak Ave, Jeddah');
    expect(customer2!.phone).toEqual('+966507654321');
    expect(customer2!.email).toEqual('jane.smith@example.com');
    expect(customer2!.id).toBeDefined();
    expect(customer2!.created_at).toBeInstanceOf(Date);
    expect(customer2!.updated_at).toBeInstanceOf(Date);
  });

  it('should return customers ordered by creation time', async () => {
    // Create customers with small delay to ensure different timestamps
    await db.insert(customersTable)
      .values(testCustomer1)
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(customersTable)
      .values(testCustomer2)
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(2);
    // First customer should have been created first
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });
});
