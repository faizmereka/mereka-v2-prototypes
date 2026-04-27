import { ApiLog } from '@core/models/ApiLog';
import type { IJobMetadata, JobContext } from '@jobs/helpers/job-runner';

/**
 * API Logs Cleanup Job Handler
 *
 * Cleans up API logs older than 30 days to prevent database bloat.
 * This is a fallback mechanism - the ApiLog model also has a TTL index
 * that automatically deletes logs after 90 days.
 *
 * @runs Daily at 3:00 AM
 */
export async function cleanupApiLogsHandler(context: JobContext): Promise<IJobMetadata> {
  const { log } = context;

  // Number of days to keep logs
  const DAYS_TO_KEEP = 30;

  log.info({ daysToKeep: DAYS_TO_KEEP }, 'Starting API logs cleanup job');

  try {
    // Calculate cutoff date
    const cutoffDate = new Date(Date.now() - DAYS_TO_KEEP * 24 * 60 * 60 * 1000);

    log.info({ cutoffDate: cutoffDate.toISOString() }, 'Deleting logs older than cutoff date');

    // Delete old logs in batches to avoid long-running operations
    const BATCH_SIZE = 10000;
    let totalDeleted = 0;
    let batchCount = 0;

    // Use a loop to delete in batches
    while (true) {
      const result = await ApiLog.deleteMany({
        createdAt: { $lt: cutoffDate },
      }).limit(BATCH_SIZE);

      const deletedCount = result.deletedCount;
      totalDeleted += deletedCount;
      batchCount++;

      log.info(
        {
          batchNumber: batchCount,
          deletedInBatch: deletedCount,
          totalDeleted,
        },
        'Batch deletion completed',
      );

      // If we deleted less than batch size, we're done
      if (deletedCount < BATCH_SIZE) {
        break;
      }

      // Safety limit - max 100 batches (1 million records)
      if (batchCount >= 100) {
        log.warn(
          { totalDeleted, batchCount },
          'Reached maximum batch limit, will continue in next run',
        );
        break;
      }
    }

    const metadata: IJobMetadata = {
      recordsProcessed: totalDeleted,
      recordsSucceeded: totalDeleted,
      recordsFailed: 0,
      daysToKeep: DAYS_TO_KEEP,
      cutoffDate: cutoffDate.toISOString(),
      batchCount,
    };

    log.info(metadata, 'API logs cleanup job completed');

    return metadata;
  } catch (error) {
    log.error({ error }, 'Error in API logs cleanup job');
    throw error;
  }
}
