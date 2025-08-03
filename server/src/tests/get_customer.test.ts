
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { getCustomer } from '../handlers/get_customer';

// Test customer data
const testCustomer: CreateCustomerInput = {
  name: 'John Doe',
  address: '123 Main Street, City',
  phone: '+1-555-0123',
  email: 'john.doe@example.com'
};

describe('getCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return customer when found', async () => {
    // Create test customer
    const insertResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    const createdCustomer = insertResult[0];
    
    // Get customer by ID
    const result = await getCustomer(createdCustomer.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdCustomer.id);
    expect(result!.name).toEqual('John Doe');
    expect(result!.address).toEqual('123 Main Street, City');
    expect(result!.phone).toEqual('+1-555-0123');
    expect(result!.email).toEqual('john.doe@example.com');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when customer not found', async () => {
    const result = await getCustomer(999);
    
    expect(result).toBeNull();
  });

  it('should return customer with correct data types', async () => {
    // Create test customer
    const insertResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    const createdCustomer = insertResult[0];
    
    // Get customer by ID
    const result = await getCustomer(createdCustomer.id);

    expect(result).not.toBeNull();
    expect(typeof result!.id).toBe('number');
    expect(typeof result!.name).toBe('string');
    expect(typeof result!.address).toBe('string');
    expect(typeof result!.phone).toBe('string');
    expect(typeof result!.email).toBe('string');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});
