
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type CreateServiceInput } from '../schema';
import { createService } from '../handlers/create_service';
import { eq } from 'drizzle-orm';

// Test input with required fields
const testInput: CreateServiceInput = {
  name: 'Airport Transfer',
  cost_price: 50.00,
  markup_percentage: 20.00
};

describe('createService', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a service with calculated selling price', async () => {
    const result = await createService(testInput);

    // Basic field validation
    expect(result.name).toEqual('Airport Transfer');
    expect(result.cost_price).toEqual(50.00);
    expect(result.markup_percentage).toEqual(20.00);
    expect(result.selling_price).toEqual(60.00); // 50 + (20% of 50) = 60
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.cost_price).toBe('number');
    expect(typeof result.markup_percentage).toBe('number');
    expect(typeof result.selling_price).toBe('number');
  });

  it('should save service to database correctly', async () => {
    const result = await createService(testInput);

    // Query the database to verify the record was saved
    const services = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, result.id))
      .execute();

    expect(services).toHaveLength(1);
    const savedService = services[0];
    
    expect(savedService.name).toEqual('Airport Transfer');
    expect(parseFloat(savedService.cost_price)).toEqual(50.00);
    expect(parseFloat(savedService.markup_percentage)).toEqual(20.00);
    expect(parseFloat(savedService.selling_price)).toEqual(60.00);
    expect(savedService.created_at).toBeInstanceOf(Date);
    expect(savedService.updated_at).toBeInstanceOf(Date);
  });

  it('should calculate selling price correctly with different markup percentages', async () => {
    const testCases = [
      { cost_price: 100.00, markup_percentage: 0, expected_selling_price: 100.00 },
      { cost_price: 100.00, markup_percentage: 50, expected_selling_price: 150.00 },
      { cost_price: 75.50, markup_percentage: 15, expected_selling_price: 86.825 }
    ];

    for (const testCase of testCases) {
      const input: CreateServiceInput = {
        name: `Test Service ${testCase.markup_percentage}%`,
        cost_price: testCase.cost_price,
        markup_percentage: testCase.markup_percentage
      };

      const result = await createService(input);
      expect(result.selling_price).toBeCloseTo(testCase.expected_selling_price, 2);
    }
  });

  it('should handle service with zero markup percentage', async () => {
    const zeroMarkupInput: CreateServiceInput = {
      name: 'No Markup Service',
      cost_price: 25.00,
      markup_percentage: 0
    };

    const result = await createService(zeroMarkupInput);

    expect(result.cost_price).toEqual(25.00);
    expect(result.markup_percentage).toEqual(0);
    expect(result.selling_price).toEqual(25.00); // No markup, same as cost price
  });

  it('should handle service with decimal cost price and markup', async () => {
    const decimalInput: CreateServiceInput = {
      name: 'Decimal Service',
      cost_price: 123.45,
      markup_percentage: 7.5
    };

    const result = await createService(decimalInput);

    expect(result.cost_price).toEqual(123.45);
    expect(result.markup_percentage).toEqual(7.5);
    // 123.45 + (7.5% of 123.45) = 123.45 + 9.26 = 132.71
    expect(result.selling_price).toBeCloseTo(132.71, 2);
  });
});
