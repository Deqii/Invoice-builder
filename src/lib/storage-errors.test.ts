import { describe, expect, it } from 'vitest'
import { StorageFailure, type StorageFailureCode } from './storage'
import {
  COLLISION_ERROR,
  CORRUPT_MESSAGE,
  NO_LOCKS_ERROR,
  SAVE_ERROR,
  storageError,
} from './storage-errors'

describe('storageError', () => {
  it('maps collision to the unique-number message', () => {
    expect(storageError(new StorageFailure('collision', 'x'))).toBe(COLLISION_ERROR)
  })

  it('maps no-locks to the browser-support message', () => {
    expect(storageError(new StorageFailure('no-locks', 'x'))).toBe(NO_LOCKS_ERROR)
  })

  it.each<StorageFailureCode>(['unavailable', 'parse', 'write', 'invalid'])(
    'maps %s to the save message',
    (code) => {
      expect(storageError(new StorageFailure(code, 'x'))).toBe(SAVE_ERROR)
    },
  )

  it('maps an unknown failure to the save message', () => {
    expect(storageError(new Error('boom'))).toBe(SAVE_ERROR)
    expect(storageError(null)).toBe(SAVE_ERROR)
  })

  it('keeps the exact copy', () => {
    expect(COLLISION_ERROR).toBe(
      'Could not assign a unique invoice number. Please try saving again.',
    )
    expect(NO_LOCKS_ERROR).toBe(
      'Saving is not available in this browser. Please use a current version of Chrome, Edge, Firefox or Safari.',
    )
    expect(SAVE_ERROR).toBe(
      'Could not save to this browser. Your changes are still here. Please try again.',
    )
    expect(CORRUPT_MESSAGE).toBe(
      'Some saved invoices could not be read, so they are not shown. Saving is disabled to protect your data.',
    )
  })
})
