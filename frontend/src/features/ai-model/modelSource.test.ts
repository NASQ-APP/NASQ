/**
 * وضع الموديل — أي جسدٍ يظهر في الاستوديو.
 *
 * العطل الذي تحرسه: «استخدمي صورتي» ما كانت تصل الاستوديو. الوضع كان
 * `useState('ready')` محليًّا في `StudioPage`، يولد من جديد مع كل فتح، بينما
 * `preferredSource` قابعٌ في المتجر محفوظًا ولا يقرأه أحد. فترفع صورتها
 * وتضغط «ابدئي التجربة» فيفتح الاستوديو على الموديل الجاهز نفسه.
 *
 * وهنا القاعدة: **الوضع يُشتقّ من المتجر، ويتبع آخر اختيار صريح.**
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { useAiModels } from './store'
import type { UserPhoto } from '@/domain/model'

const PHOTO: UserPhoto = {
  id: 'photo-1',
  // ليس `blob:` عمدًا — `URL.revokeObjectURL` غير موجودة في بيئة الاختبار
  url: 'https://example.test/me.jpg',
  fileName: 'me.jpg',
  width: 736,
  height: 1104,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const state = () => useAiModels.getState()

beforeEach(() => {
  useAiModels.setState({
    models: [],
    activeModelId: undefined,
    readyModelId: undefined,
    photo: undefined,
    preferredSource: 'model',
  })
})

describe('رفع الصورة يعلن الاختيار بنفسه', () => {
  it('يصير الوضع «صورة» بلا زرٍّ ثانٍ يؤكّده', () => {
    state().setPhoto(PHOTO)
    expect(state().preferredSource).toBe('photo')
    expect(state().photo?.id).toBe('photo-1')
  })

  it('وحذفها يرجع لوضع الموديل — لا يبقى على صورةٍ ما عادت موجودة', () => {
    state().setPhoto(PHOTO)
    state().clearPhoto()
    expect(state().photo).toBeUndefined()
    expect(state().preferredSource).toBe('model')
  })
})

describe('اختيار موديل بعينه يرجّع وضع الموديل', () => {
  it('الموديل الجاهز', () => {
    state().setPhoto(PHOTO)
    state().setReadyModel('ready-2')
    expect(state().preferredSource).toBe('model')
    expect(state().readyModelId).toBe('ready-2')
  })

  it('والموديل المحفوظ', () => {
    state().setPhoto(PHOTO)
    state().setActive('model-9')
    expect(state().preferredSource).toBe('model')
  })

  it('وفكّ التثبيت لا يقلبها لوضع الصورة', () => {
    state().setReadyModel(undefined)
    expect(state().preferredSource).toBe('model')
    expect(state().readyModelId).toBeUndefined()
  })
})

describe('الخروج لا يترك جسدًا خلفه', () => {
  it('يمسح الصورة والوضع معًا — لا يراهما من يدخل بعدها', () => {
    state().setPhoto(PHOTO)
    state().setReadyModel('ready-2')
    state().setActive('model-9')

    state().reset()

    expect(state().photo).toBeUndefined()
    expect(state().preferredSource).toBe('model')
    expect(state().activeModelId).toBeUndefined()
    expect(state().readyModelId).toBeUndefined()
    expect(state().models).toEqual([])
  })
})

/*
  ما لا يُختبر هنا: **أن الصورة لا تُحفظ في التخزين** (§17). الضمانة في
  `partialize` ولم تُمَسّ، و`persist` نفسها غير مركّبة في بيئة `node` بلا
  `localStorage` — فاختبارها هنا يقيس الهيكل لا الشيفرة.
*/
