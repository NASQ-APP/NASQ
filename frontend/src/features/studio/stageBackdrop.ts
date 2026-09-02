/**
 * خلفية المشهد تحت الصورة المعروضة.
 *
 * كان الاستوديو مشهدًا مرسومًا: منصّة بيضاء وإضاءة، والصورة تُعرض فوقهما بخلط
 * `multiply` ليذوب بياضها فيهما. وسقط هذا لسببين قِيسا على الجهاز:
 *
 * **الأول: خلفية الصور المولّدة ليست بيضاء.** ردّ المولّد كان `rgb(233,234,237)`
 * — رمادي مزرقّ تقرؤه العين أبيض. وعلى أرضية `rgb(214,214,210)` يعطي الضرب
 * `195`، فتظهر النتيجة مستطيلاً أغمق من محيطه وله حدّ يُرى. والمزوّدون يختلفون
 * في هذا الانحراف، فتشتغل عند جهاز وتُخفق عند آخر بلا فرق في الشيفرة.
 *
 * **والثاني: `multiply` يمزج ولا يغطّي.** فما يُرسم تحت الصورة يطلّ من خلالها،
 * وكلّما فتح لون القماش بان ما تحته أكثر. ففستان أبيض يُقرأ **شفافًا**، وحافة
 * المنصّة تمرّ عبر ذيله.
 *
 * وتبييض الخلفية بمعالجة البكسلات يزيد الطين بلّة: الفستان الأبيض والخلفية
 * البيضاء يفترقان بدرجات معدودة، فأي عتبة تكفي لتبييض الخلفية تبتلع الفستان
 * معها — و`multiply` يجعل ٢٥٥ شفافًا تمامًا، فيختفي الفستان في الأرضية.
 *
 * فذهب المشهد المرسوم وذهب معه الخلط: اللوحة بيضاء والصورة تُرسم صمّاء فوقها،
 * فما يطلّ من خلال القماش شيء.
 *
 * ويبقى سؤال الحدّ: الأبيض الصافي لا يطابق خلفية كل صورة. فتُقاس خلفيّتها من
 * إطارها وتُطلى بها اللوحة، فيتّصل ما حول الصورة بما فيها ولا يبقى لها طرف.
 * ولا تُمسّ بكسلة واحدة — القماش بلونه، والأبيض أبيض.
 */
import { useEffect, useState } from 'react'

/** عرض الشريط المقروء من كل حافة. */
const MARGIN = 3

const median = (values: number[]) => values.toSorted((a, b) => a - b)[values.length >> 1]

/** الوسيط لا الأدنى: بكسل شارد أو ظلّ يلامس حافة لا يجرّ لون المشهد معه. */
function frameColor(data: Uint8ClampedArray, width: number, height: number) {
  const channels: [number[], number[], number[]] = [[], [], []]

  const sample = (x: number, y: number) => {
    const at = (y * width + x) * 4
    channels[0].push(data[at])
    channels[1].push(data[at + 1])
    channels[2].push(data[at + 2])
  }

  for (let x = 0; x < width; x += 1) {
    for (let m = 0; m < MARGIN; m += 1) {
      sample(x, m)
      sample(x, height - 1 - m)
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let m = 0; m < MARGIN; m += 1) {
      sample(m, y)
      sample(width - 1 - m, y)
    }
  }

  return channels.map(median) as [number, number, number]
}

async function readBackdrop(image: string) {
  const response = await fetch(image)
  const bitmap = await createImageBitmap(await response.blob())

  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    bitmap.close()
    return undefined
  }

  context.drawImage(bitmap, 0, 0)
  bitmap.close()

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  return `rgb(${frameColor(data, canvas.width, canvas.height).join(', ')})`
}

/**
 * لون خلفية الصورة، أو `undefined` قبل قراءتها وعند تعذّرها — وعندها تبقى
 * اللوحة بيضاء، وهو أقرب تخمين لخلفية صورة موديل.
 */
export function useStageBackdrop(image?: string) {
  const [read, setRead] = useState<{ image: string; color: string }>()

  useEffect(() => {
    if (!image) return

    let live = true
    void readBackdrop(image)
      .then((color) => {
        if (live && color) setRead({ image, color })
      })
      .catch(() => {})

    return () => {
      live = false
    }
  }, [image])

  // مربوط بالصورة التي قُرئ منها: صورة جديدة تعود للأبيض حتى يصل لونها، فما
  // تُطلى لوحةٌ بلون صورة سابقة
  return read && read.image === image ? read.color : undefined
}
