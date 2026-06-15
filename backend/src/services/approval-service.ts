import { DesignPlan } from '@unifiedaitoolbox/shared';

export interface ApprovalRequest {
  designPlanId: string;
  approver: string;
  decision: 'approve' | 'reject';
  comments?: string;
}

export interface ApprovalResult {
  designPlan: DesignPlan;
  previousStatus: string;
  newStatus: string;
  approvalTime: string;
  approver: string;
}

export class ApprovalService {
  validateTransition(currentStatus: string, decision: 'approve' | 'reject'): boolean {
    // Can only approve/reject from draft or reviewing status
    if (currentStatus !== 'draft' && currentStatus !== 'reviewing') {
      return false;
    }
    return true;
  }

  getNextStatus(decision: 'approve' | 'reject'): 'approved' | 'rejected' {
    return decision === 'approve' ? 'approved' : 'rejected';
  }

  applyApproval(
    designPlan: DesignPlan,
    decision: 'approve' | 'reject',
    approver: string
  ): DesignPlan {
    if (!this.validateTransition(designPlan.status, decision)) {
      throw new Error(`Cannot ${decision} design plan with status: ${designPlan.status}`);
    }

    const newStatus = this.getNextStatus(decision);
    const now = new Date().toISOString();

    return {
      ...designPlan,
      status: newStatus,
      approvedBy: approver,
      approvedAt: now,
      updatedAt: now,
    };
  }

  moveToReview(designPlan: DesignPlan): DesignPlan {
    if (designPlan.status !== 'draft') {
      throw new Error(`Can only move to review from draft status, current: ${designPlan.status}`);
    }

    return {
      ...designPlan,
      status: 'reviewing',
      updatedAt: new Date().toISOString(),
    };
  }
}
