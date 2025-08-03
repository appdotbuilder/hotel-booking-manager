
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type CreateServiceInput } from '../schema';
import { getService } from '../handlers/get_service';

const testServiceInput: CreateServiceInput = {
  name: 'Test Service',
  cost_price: 50.00,
  markup_percentage: 30.00
};

describe('getService', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a service by id', async () => {
    // Create test service
    const insertResult = await db.insert(servicesTable)
      .values({
        name: testServiceInput.name,
        cost_price: testServiceInput.cost_price.toString(),
        markup_percentage: testServiceInput.markup_percentage.toString(),
        selling_price: (testServiceInput.cost_price + (testServiceInput.markup_percentage / 100 * testServiceInput.cost_price)).toString()
      })
      .returning()
      .execute();

    const serviceId = insertResult[0].id;

    // Test retrieval
    const result = await getService(serviceId);

    expect(result).toBeDefined();
    expect(result?.id).toBe(serviceId);
    expect(result?.name).toBe('Test Service');
    expect(result?.cost_price).toBe(50.00);
    expect(result?.markup_percentage).toBe(30.00);
    expect(result?.selling_price).toBe(65.00);
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result?.cost_price).toBe('number');
    expect(typeof result?.markup_percentage).toBe('number');
    expect(typeof result?.selling_price).toBe('number');
  });

  it('should return null for non-existent service', async () => {
    const result = await getService(999);
    expect(result).toBeNull();
  });

  it('should handle different service data correctly', async () => {
    // Create service with different values
    const serviceData = {
      name: 'Airport Transfer',
      cost_price: 25.50,
      markup_percentage: 15.75
    };

    const expectedSellingPrice = serviceData.cost_price + (serviceData.markup_percentage / 100 * serviceData.cost_price);

    const insertResult = await db.insert(servicesTable)
      .values({
        name: serviceData.name,
        cost_price: serviceData.cost_price.toString(),
        markup_percentage: serviceData.markup_percentage.toString(),
        selling_price: expectedSellingPrice.toString()
      })
      .returning()
      .execute();

    const serviceId = insertResult[0].id;
    const result = await getService(serviceId);

    expect(result).toBeDefined();
    expect(result?.name).toBe('Airport Transfer');
    expect(result?.cost_price).toBe(25.50);
    expect(result?.markup_percentage).toBe(15.75);
    expect(result?.selling_price).toBeCloseTo(29.52, 2);
  });
});
