export interface Plan {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class PlanService {
  async getPlanById(id: string): Promise<Plan | null> {
    throw new Error(`PlanService.getPlanById(${id}) not yet implemented`);
  }

  async createPlan(input: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan> {
    throw new Error('PlanService.createPlan not yet implemented');
  }
}

export default new PlanService();
