/**
 * Upload Engine Event Types
 *
 * Events emitted by the UploadEngine to decouple
 * batch lifecycle management from the core state machine.
 */

export type UploadEngineEvents = {
  /**
   * Emitted when a batch is completed (all files reached terminal state)
   */
  'batch:complete': { batchId: string | null };

  /**
   * Emitted when a batch starts
   */
  'batch:start': { batchId: string | null; fileCount: number };

  /**
   * Emitted when files are appended to an active batch
   */
  'batch:append': { batchId: string | null; fileCount: number };

  /**
   * Emitted when a batch is cleared
   */
  'batch:clear': undefined;
};
