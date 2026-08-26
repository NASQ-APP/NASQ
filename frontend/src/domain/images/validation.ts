/** التحقق من الملف قبل أي معالجة — نوع وحجم فقط، بلا قراءة محتوى. */
import { imageError, type ImageError } from './types'

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

/** قيمة السمة `accept` في حقل الملف. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',')

export const MAX_IMAGE_MB = 12

export type ValidationOptions = {
  acceptedTypes?: readonly string[]
  maxBytes?: number
}

type ValidatableFile = Pick<File, 'type' | 'size'>

export function validateImageFile(
  file: ValidatableFile,
  { acceptedTypes = ACCEPTED_IMAGE_TYPES, maxBytes = MAX_IMAGE_MB * 1024 * 1024 }: ValidationOptions = {},
): ImageError | null {
  // بعض الأجهزة ترسل image/jpg بدل image/jpeg
  const type = file.type === 'image/jpg' ? 'image/jpeg' : file.type
  if (!acceptedTypes.includes(type)) return imageError('unsupported-type')
  if (file.size > maxBytes) return imageError('too-large')
  return null
}
