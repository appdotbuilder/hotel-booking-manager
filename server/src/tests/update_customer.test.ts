
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput, type UpdateCustomerInput } from '../schema';
import { updateCustomer } from '../handlers/update_customer';
import { eq } from 'drizzle-orm';

// Test data
const createTestCustomer = async (): Promise<number> => {
  const customerData: CreateCustomerInput = {
    name: 'John Doe',
    address: '123 Main St',
    phone: '555-0123',
    email: 'john.doe@example.com'
  };

  const result = await db.insert(customersTable)
    .values({
      ...customerData,
      created_at: new Date(),
      updated_at: new Date()
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update customer name', async () => {
    const customerId = await createTestCustomer();
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Jane Smith'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Jane Smith');
    expect(result.address).toEqual('123 Main St'); // Should remain unchanged
    expect(result.phone).toEqual('555-0123'); // Should remain unchanged
    expect(result.email).toEqual('john.doe@example.com'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update customer address', async () => {
    const customerId = await createTestCustomer();
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      address: '456 Oak Avenue'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('John Doe'); // Should remain unchanged
    expect(result.address).toEqual('456 Oak Avenue');
    expect(result.phone).toEqual('555-0123'); // Should remain unchanged
    expect(result.email).toEqual('john.doe@example.com'); // Should remain unchanged
  });

  it('should update customer phone', async () => {
    const customerId = await createTestCustomer();
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      phone: '555-9999'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('John Doe'); // Should remain unchanged
    expect(result.address).toEqual('123 Main St'); // Should remain unchanged
    expect(result.phone).toEqual('555-9999');
    expect(result.email).toEqual('john.doe@example.com'); // Should remain unchanged
  });

  it('should update customer email', async () => {
    const customerId = await createTestCustomer();
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      email: 'jane.smith@example.com'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('John Doe'); // Should remain unchanged
    expect(result.address).toEqual('123 Main St'); // Should remain unchanged
    expect(result.phone).toEqual('555-0123'); // Should remain unchanged
    expect(result.email).toEqual('jane.smith@example.com');
  });

  it('should update multiple fields at once', async () => {
    const customerId = await createTestCustomer();
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Jane Smith',
      address: '789 Pine Street',
      phone: '555-7777',
      email: 'jane.smith@newdomain.com'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Jane Smith');
    expect(result.address).toEqual('789 Pine Street');
    expect(result.phone).toEqual('555-7777');
    expect(result.email).toEqual('jane.smith@newdomain.com');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    const customerId = await createTestCustomer();
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Updated Name',
      email: 'updated@example.com'
    };

    await updateCustomer(updateInput);

    // Verify changes are persisted in database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('Updated Name');
    expect(customers[0].email).toEqual('updated@example.com');
    expect(customers[0].address).toEqual('123 Main St'); // Should remain unchanged
    expect(customers[0].phone).toEqual('555-0123'); // Should remain unchanged
    expect(customers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp', async () => {
    const customerId = await createTestCustomer();
    
    // Get original timestamp
    const originalCustomer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Updated Name'
    };

    const result = await updateCustomer(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalCustomer[0].updated_at.getTime());
  });

  it('should handle partial updates correctly', async () => {
    const customerId = await createTestCustomer();
    const updateInput: UpdateCustomerInput = {
      id: customerId
      // No fields to update - should still work and update timestamp
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('John Doe'); // Should remain unchanged
    expect(result.address).toEqual('123 Main St'); // Should remain unchanged
    expect(result.phone).toEqual('555-0123'); // Should remain unchanged
    expect(result.email).toEqual('john.doe@example.com'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent customer', async () => {
    const updateInput: UpdateCustomerInput = {
      id: 99999,
      name: 'Non-existent Customer'
    };

    expect(updateCustomer(updateInput)).rejects.toThrow(/Customer with ID 99999 not found/i);
  });

  it('should preserve created_at timestamp', async () => {
    const customerId = await createTestCustomer();
    
    // Get original created_at timestamp
    const originalCustomer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Updated Name'
    };

    const result = await updateCustomer(updateInput);

    expect(result.created_at.getTime()).toEqual(originalCustomer[0].created_at.getTime());
  });
});
