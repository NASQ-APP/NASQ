/**
 * حذف الحساب — الحالات التي لا يصح أن تنكسر بصمت.
 *
 * الحرس الأهم: **الفشل لا يمسح شيئًا**. لو مُسحت البيانات المحلية ثم فشل
 * الحذف على الخادم، فقدت المستخدمة خزانتها وحسابها ما زال قائمًا — أسوأ من
 * ألا نحذف أصلًا.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

const deleteAccountOnServer = vi.fn()

vi.mock('@/infrastructure/auth', () => ({
  authProvider: {
    deleteAccount: deleteAccountOnServer,
    syncsAcrossDevices: true,
  },
}))

const { clearLocalUserData } = await import('./clearLocalData')

/** localStorage بسيط في بيئة node — الاختبارات تعمل بلا DOM. */
function fakeStorage(seed: Record<string, string>) {
  const map = new Map(Object.entries(seed))
  return {
    get length() {
      return map.size
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
    keys: () => [...map.keys()],
  }
}

beforeEach(() => {
  deleteAccountOnServer.mockReset()
  vi.stubGlobal('indexedDB', undefined)
})

describe('تنظيف البيانات المحلية', () => {
  it('يمسح كل مفاتيح التطبيق ولا يلمس غيرها', async () => {
    const storage = fakeStorage({
      'nasaq.wardrobe': '1',
      'nasaq.models': '1',
      'nasaq.looks': '1',
      'dulabi.wardrobe': '1', // مفاتيح الاسم القديم تُمسح كذلك
      'unrelated-app': 'keep',
      'sb-auth-token': 'keep',
    })
    vi.stubGlobal('localStorage', storage)

    await clearLocalUserData()

    expect(storage.keys().toSorted()).toEqual(['sb-auth-token', 'unrelated-app'])
  })

  it('يمسح مفاتيح تُضاف مستقبلًا — المسح بالبادئة لا بقائمة', async () => {
    const storage = fakeStorage({ 'nasaq.future-store-not-yet-written': '1' })
    vi.stubGlobal('localStorage', storage)

    await clearLocalUserData()

    expect(storage.keys()).toEqual([])
  })

  it('لا يرمي لو كان التخزين معطّلاً', async () => {
    vi.stubGlobal('localStorage', {
      get length(): number {
        throw new Error('storage disabled')
      },
    })

    await expect(clearLocalUserData()).resolves.toBeUndefined()
  })
})

describe('ترتيب الحذف', () => {
  it('B · النجاح يمسح المحلي بعد الخادم', async () => {
    const order: string[] = []
    const storage = fakeStorage({ 'nasaq.wardrobe': '1' })
    vi.stubGlobal('localStorage', storage)

    deleteAccountOnServer.mockImplementation(async () => {
      order.push('server')
      expect(storage.keys()).toEqual(['nasaq.wardrobe'])
    })

    await deleteAccountOnServer()
    await clearLocalUserData()
    order.push('local')

    expect(order).toEqual(['server', 'local'])
    expect(storage.keys()).toEqual([])
  })

  it('D/E · فشل الخادم لا يمسح شيئًا', async () => {
    const storage = fakeStorage({ 'nasaq.wardrobe': '1', 'nasaq.looks': '1' })
    vi.stubGlobal('localStorage', storage)
    deleteAccountOnServer.mockRejectedValue(new Error('provider down'))

    const { useAuth } = await import('./store')
    const failure = await useAuth.getState().deleteAccount()

    expect(failure).toBeDefined()
    // البيانات كما هي — الحساب ما زال قائمًا
    expect(storage.keys().toSorted()).toEqual(['nasaq.looks', 'nasaq.wardrobe'])
    expect(useAuth.getState().user).toBeUndefined()
  })
})

describe('هوية من يُحذف', () => {
  it('C · لا يقبل معرّف مستخدم من العميل', async () => {
    deleteAccountOnServer.mockResolvedValue(undefined)
    const { authProvider } = await import('@/infrastructure/auth')

    await authProvider.deleteAccount()

    // بلا معاملات: المُعرِّف يجي من الرمز الموقّع على الخادم لا من الواجهة
    expect(deleteAccountOnServer).toHaveBeenCalledWith()
    expect(authProvider.deleteAccount.length).toBe(0)
  })
})
