/**
 * آلة حالة رفع الصورة.
 *
 * المسار: اختيار صورة ← إزالة الخلفية ← معاينة ← موافقة المستخدمة ← حفظ.
 * **ما نحفظ شيئًا قبل الموافقة** — الحفظ خارج هذي الآلة تمامًا.
 *
 * ليش reducer نقي مو حالة داخل الهوك: المنطق هنا فيه حالات متشابكة (إلغاء،
 * صورة ثانية أثناء المعالجة، نتيجة متأخرة لطلب ملغى) — وفصلها يخليها تُختبر
 * بلا DOM ولا React، ويخلي الهوك مجرد وصلة بين الآلة والشبكة.
 */
import type { ImageError } from './types'

/** صورة في الذاكرة. الروابط (`objectURL`) مسؤولية الهوك، مو الآلة. */
export type ImageCandidate = {
  blob: Blob
  /** الاسم الأصلي للملف — يُستخدم كاقتراح لاسم القطعة */
  fileName: string
  /** true لو مرّت على إزالة الخلفية. الحفظ يسطّحها على أبيض في الحالتين. */
  transparent: boolean
}

export type UploadStatus = 'idle' | 'processing' | 'ready' | 'failed'

export type UploadState = {
  status: UploadStatus
  /** يزيد مع كل اختيار جديد — يُسقط نتائج الطلبات القديمة */
  requestId: number
  original?: ImageCandidate
  processed?: ImageCandidate
  /** أي نسخة اختارتها المستخدمة للحفظ */
  chosen: 'processed' | 'original'
  error?: ImageError
}

/**
 * `requestId` يجي من المنادي دائمًا، وما تولّده الآلة.
 * لو ولّدته الآلة والمنادي معًا، اختلافهما يخلي نتيجة المعالجة تُسقط بصمت
 * وتبقى الشاشة عالقة على «جاري المعالجة».
 */
export type UploadEvent =
  /** اختارت صورة — مع `removeBackground` نبدأ المعالجة، وبدونها نجهز فورًا */
  | { type: 'select'; requestId: number; original: ImageCandidate; removeBackground: boolean }
  | { type: 'processed'; requestId: number; processed: ImageCandidate }
  | { type: 'failed'; requestId: number; error: ImageError }
  | { type: 'retry'; requestId: number }
  | { type: 'choose'; version: 'processed' | 'original' }
  | { type: 'reset' }

export const initialUploadState: UploadState = {
  status: 'idle',
  requestId: 0,
  chosen: 'processed',
}

export function uploadReducer(state: UploadState, event: UploadEvent): UploadState {
  switch (event.type) {
    case 'select': {
      return {
        status: event.removeBackground ? 'processing' : 'ready',
        requestId: event.requestId,
        original: event.original,
        processed: undefined,
        chosen: event.removeBackground ? 'processed' : 'original',
        error: undefined,
      }
    }

    // نتيجة طلب قديم ما تغيّر الصورة الجديدة
    case 'processed':
      if (event.requestId !== state.requestId || state.status !== 'processing') return state
      return { ...state, status: 'ready', processed: event.processed, chosen: 'processed' }

    case 'failed':
      if (event.requestId !== state.requestId || state.status !== 'processing') return state
      return { ...state, status: 'failed', error: event.error, chosen: 'original' }

    case 'retry':
      if (!state.original) return state
      return {
        ...state,
        status: 'processing',
        requestId: event.requestId,
        processed: undefined,
        error: undefined,
        chosen: 'processed',
      }

    case 'choose':
      // المعالجة لسه شغالة، أو النسخة المطلوبة غير موجودة
      if (state.status === 'processing') return state
      if (event.version === 'processed' && !state.processed) return state
      return { ...state, chosen: event.version }

    case 'reset':
      // نقفز بالمعرّف حتى تُسقَط نتيجة أي طلب كان جاريًا
      return { ...initialUploadState, requestId: state.requestId + 1 }
  }
}

/** الصورة اللي راح تُحفظ لو وافقت المستخدمة الآن — أو undefined لو ما فيه. */
export function selectedCandidate(state: UploadState): ImageCandidate | undefined {
  if (state.status === 'processing' || state.status === 'idle') return undefined
  return state.chosen === 'processed' ? (state.processed ?? state.original) : state.original
}

/** هل زر الحفظ مفعّل؟ */
export const canConfirm = (state: UploadState): boolean => selectedCandidate(state) !== undefined
