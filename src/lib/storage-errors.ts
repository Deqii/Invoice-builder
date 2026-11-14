import { StorageFailure } from './storage'

export const SAVE_ERROR =
  'Could not save to this browser. Your changes are still here. Please try again.'
export const COLLISION_ERROR =
  'Could not assign a unique invoice number. Please try saving again.'
export const NO_LOCKS_ERROR =
  'Saving is not available in this browser. Please use a current version of Chrome, Edge, Firefox or Safari.'
export const CORRUPT_MESSAGE =
  'Some saved invoices could not be read, so they are not shown. Saving is disabled to protect your data.'

export function storageError(failure: unknown): string {
  if (failure instanceof StorageFailure) {
    if (failure.code === 'no-locks') return NO_LOCKS_ERROR
    if (failure.code === 'collision') return COLLISION_ERROR
  }
  return SAVE_ERROR
}
