
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { getServices } from '../handlers/get_services';

describe('getServices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no services exist', async () => {
    const result = await getServices();
    expect(result).toEqual([]);
  });

  it('should return all services with correct data types', async () => {
    // Create test services
    await db.insert(servicesTable)
      .values([
        {
          name: 'Airport Transfer',
          cost_price: '25.50',
          markup_percentage: '20.00',
          selling_price: '30.60'
        },
        {
          name: 'City Tour',
          cost_price: '45.00',
          markup_percentage: '15.50',
          selling_price: '51.98'
        }
      ])
      .execute();

    const result = await getServices();

    expect(result).toHaveLength(2);

    // Check first service
    expect(result[0].name).toBe('Airport Transfer');
    expect(result[0].cost_price).toBe(25.50);
    expect(typeof result[0].cost_price).toBe('number');
    expect(result[0].markup_percentage).toBe(20.00);
    expect(typeof result[0].markup_percentage).toBe('number');
    expect(result[0].selling_price).toBe(30.60);
    expect(typeof result[0].selling_price).toBe('number');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Check second service
    expect(result[1].name).toBe('City Tour');
    expect(result[1].cost_price).toBe(45.00);
    expect(result[1].markup_percentage).toBe(15.50);
    expect(result[1].selling_price).toBe(51.98);
  });

  it('should handle services with zero values correctly', async () => {
    // Create service with zero markup
    await db.insert(servicesTable)
      .values({
        name: 'Free Service',
        cost_price: '0.00',
        markup_percentage: '0.00',
        selling_price: '0.00'
      })
      .execute();

    const result = await getServices();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Free Service');
    expect(result[0].cost_price).toBe(0);
    expect(result[0].markup_percentage).toBe(0);
    expect(result[0].selling_price).toBe(0);
    expect(typeof result[0].cost_price).toBe('number');
    expect(typeof result[0].markup_percentage).toBe('number');
    expect(typeof result[0].selling_price).toBe('number');
  });
});
