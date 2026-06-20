import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FailureDetail } from '../../src/components/FailureDetail';

describe('FailureDetail', () => {
  it('renders run-level failure details with classification and confidence', () => {
    render(
      <FailureDetail
        runError="Tool call denied"
        overallClassification={{
          failureType: 'tool_denied',
          severity: 'high',
          errorType: 'permission',
          confidence: 0.92,
          evidence: ['Permission check failed', 'Missing required scope'],
        }}
        failedTasks={[]}
      />
    );

    expect(screen.getByText('Run Error')).toBeInTheDocument();
    expect(screen.getByText('Tool call denied')).toBeInTheDocument();
    expect(screen.getByText('Tool/Permission Denied')).toBeInTheDocument();
    expect(screen.getByText('92% confidence')).toBeInTheDocument();
    expect(screen.getByText('Permission check failed')).toBeInTheDocument();
  });

  it('renders failed task rows with mapped labels', () => {
    render(
      <FailureDetail
        runError={null}
        overallClassification={null}
        failedTasks={[
          {
            taskId: 'task-1',
            taskName: 'Run unit tests',
            phaseId: 'phase-1',
            error: 'Test suite failed',
            classification: {
              failureType: 'test_failed',
              severity: 'medium',
              errorType: 'assertion',
              confidence: 0.8,
              evidence: ['2 failing tests'],
            },
          },
        ]}
      />
    );

    expect(screen.getByText('Failed Tasks (1)')).toBeInTheDocument();
    expect(screen.getByText('Run unit tests')).toBeInTheDocument();
    expect(screen.getByText('Test Failed')).toBeInTheDocument();
    expect(screen.getByText('80% confidence')).toBeInTheDocument();
  });
});
