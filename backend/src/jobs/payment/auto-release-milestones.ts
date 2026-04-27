import type { IJobMetadata, JobContext } from '@jobs/helpers/job-runner';
import {
  hubContractNotificationService,
  hubMilestoneService as milestoneService,
} from '@services/hub';

/**
 * Auto-Release Milestones Job Handler
 *
 * Automatically releases payments for milestones where:
 * - Work has been submitted
 * - Client hasn't released payment within 7 days
 *
 * This protects experts by ensuring they get paid even if client
 * doesn't explicitly release the payment.
 *
 * @runs Daily at 2:00 AM
 */
export async function autoReleaseMilestonesHandler(context: JobContext): Promise<IJobMetadata> {
  const { log } = context;

  log.info('Starting auto-release milestones job');

  try {
    // Get milestones eligible for auto-release (work submitted > 7 days ago)
    const milestones = await milestoneService.getMilestonesForAutoRelease();

    if (milestones.length === 0) {
      log.info('No milestones eligible for auto-release');
      return {
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
      };
    }

    log.info({ count: milestones.length }, 'Found milestones eligible for auto-release');

    let successCount = 0;
    let failCount = 0;

    // Process each milestone individually
    for (const milestone of milestones) {
      try {
        log.info(
          {
            milestoneId: milestone._id,
            contractId: milestone.contractId,
            taskName: milestone.taskName,
            workSubmittedDate: milestone.workSubmittedDate,
          },
          'Auto-releasing milestone payment',
        );

        // Use system user ID for auto-release
        const systemUserId = 'system-auto-release';

        await milestoneService.releaseMilestonePayment([milestone._id], systemUserId);

        // Send notification to both parties about auto-release
        await hubContractNotificationService.notifyMilestoneAutoReleased(milestone._id);

        log.info(
          {
            milestoneId: milestone._id,
            amount: milestone.amount,
          },
          'Milestone auto-released successfully',
        );

        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.error(
          {
            milestoneId: milestone._id,
            contractId: milestone.contractId,
            error: errorMessage,
          },
          'Failed to auto-release milestone',
        );
        failCount++;
      }
    }

    const metadata: IJobMetadata = {
      recordsProcessed: milestones.length,
      recordsSucceeded: successCount,
      recordsFailed: failCount,
    };

    log.info(metadata, 'Auto-release milestones job completed');

    return metadata;
  } catch (error) {
    log.error({ error }, 'Error in auto-release milestones job');
    throw error;
  }
}
