
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type UpdateServiceInput, type CreateServiceInput } from '../schema';
import { updateService } from '../handlers/update_service';
import { eq } from 'drizzle-orm';

// Helper function to create a test service
const createTestService = async (serviceData: CreateServiceInput) => {
  const sellingPrice = serviceData.cost_price + (serviceData.markup_percentage / 100 * serviceData.cost_price);
  
  const result = await db.insert(servicesTable)
    .values({
      name: serviceData.name,
      cost_price: serviceData.cost_price.toString(),
      markup_percentage: serviceData.markup_percentage.toString(),
      selling_price: sellingPrice.toString()
    })
    .returning()
    .execute();

  return {
    ...result[0],
    cost_price: parseFloat(result[0].cost_price),
    markup_percentage: parseFloat(result[0].markup_percentage),
    selling_price: parseFloat(result[0].selling_price)
  };
};

describe('updateService', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update service name only', async () => {
    // Create test service
    const testService = await createTestService({
      name: 'Airport Transfer',
      cost_price: 100,
      markup_percentage: 20
    });

    const updateInput: UpdateServiceInput = {
      id: testService.id,
      name: 'Premium Airport Transfer'
    };

    const result = await updateService(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(testService.id);
    expect(result.name).toEqual('Premium Airport Transfer');
    expect(result.cost_price).toEqual(100);
    expect(result.markup_percentage).toEqual(20);
    expect(result.selling_price).toEqual(120); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testService.updated_at).toBe(true);
  });

  it('should update cost price and recalculate selling price', async () => {
    // Create test service
    const testService = await createTestService({
      name: 'City Tour',
      cost_price: 150,
      markup_percentage: 25
    });

    const updateInput: UpdateServiceInput = {
      id: testService.id,
      cost_price: 200
    };

    const result = await updateService(updateInput);

    // Verify cost price updated and selling price recalculated
    expect(result.id).toEqual(testService.id);
    expect(result.name).toEqual('City Tour');
    expect(result.cost_price).toEqual(200);
    expect(result.markup_percentage).toEqual(25);
    expect(result.selling_price).toEqual(250); // 200 + (25% * 200) = 250
  });

  it('should update markup percentage and recalculate selling price', async () => {
    // Create test service
    const testService = await createTestService({
      name: 'Museum Visit',
      cost_price: 80,
      markup_percentage: 15
    });

    const updateInput: UpdateServiceInput = {
      id: testService.id,
      markup_percentage: 30
    };

    const result = await updateService(updateInput);

    // Verify markup percentage updated and selling price recalculated
    expect(result.id).toEqual(testService.id);
    expect(result.name).toEqual('Museum Visit');
    expect(result.cost_price).toEqual(80);
    expect(result.markup_percentage).toEqual(30);
    expect(result.selling_price).toEqual(104); // 80 + (30% * 80) = 104
  });

  it('should update multiple fields and recalculate selling price', async () => {
    // Create test service
    const testService = await createTestService({
      name: 'Desert Safari',
      cost_price: 250,
      markup_percentage: 40
    });

    const updateInput: UpdateServiceInput = {
      id: testService.id,
      name: 'Premium Desert Safari',
      cost_price: 300,
      markup_percentage: 35
    };

    const result = await updateService(updateInput);

    // Verify all fields updated and selling price recalculated
    expect(result.id).toEqual(testService.id);
    expect(result.name).toEqual('Premium Desert Safari');
    expect(result.cost_price).toEqual(300);
    expect(result.markup_percentage).toEqual(35);
    expect(result.selling_price).toEqual(405); // 300 + (35% * 300) = 405
  });

  it('should save updated service to database', async () => {
    // Create test service
    const testService = await createTestService({
      name: 'Boat Trip',
      cost_price: 120,
      markup_percentage: 50
    });

    const updateInput: UpdateServiceInput = {
      id: testService.id,
      name: 'Luxury Boat Trip',
      cost_price: 180
    };

    await updateService(updateInput);

    // Verify database was updated
    const services = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, testService.id))
      .execute();

    expect(services).toHaveLength(1);
    const savedService = services[0];
    expect(savedService.name).toEqual('Luxury Boat Trip');
    expect(parseFloat(savedService.cost_price)).toEqual(180);
    expect(parseFloat(savedService.markup_percentage)).toEqual(50);
    expect(parseFloat(savedService.selling_price)).toEqual(270); // 180 + (50% * 180) = 270
  });

  it('should handle zero markup percentage correctly', async () => {
    // Create test service
    const testService = await createTestService({
      name: 'Free Walking Tour',
      cost_price: 0,
      markup_percentage: 100
    });

    const updateInput: UpdateServiceInput = {
      id: testService.id,
      cost_price: 50,
      markup_percentage: 0
    };

    const result = await updateService(updateInput);

    // Verify zero markup calculation
    expect(result.cost_price).toEqual(50);
    expect(result.markup_percentage).toEqual(0);
    expect(result.selling_price).toEqual(50); // 50 + (0% * 50) = 50
  });

  it('should throw error for non-existent service', async () => {
    const updateInput: UpdateServiceInput = {
      id: 99999,
      name: 'Non-existent Service'
    };

    expect(updateService(updateInput)).rejects.toThrow(/service with id 99999 not found/i);
  });

  it('should handle decimal calculations correctly', async () => {
    // Create test service with decimal values
    const testService = await createTestService({
      name: 'Guided Tour',
      cost_price: 33.33,
      markup_percentage: 15.5
    });

    const updateInput: UpdateServiceInput = {
      id: testService.id,
      cost_price: 66.67,
      markup_percentage: 22.5
    };

    const result = await updateService(updateInput);

    // Verify decimal calculation: 66.67 + (22.5% * 66.67) = 66.67 + 15.00075 = 81.67075
    expect(result.cost_price).toEqual(66.67);
    expect(result.markup_percentage).toEqual(22.5);
    expect(result.selling_price).toBeCloseTo(81.67, 2);
  });
});
