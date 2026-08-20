import type { Product } from './types'

export type HealthInsight = {
  title: string
  summary: string
  body: string
  sourceName: string
  sourceUrl: string
}

const cigaretteInsight: HealthInsight = {
  title: 'Судини, легені та дим поруч',
  summary: 'Сигаретний дим впливає не лише на легені — він шкодить судинам і людям поруч.',
  body:
    'Тривале куріння підвищує ризик хвороб серця й судин, інсульту, ХОЗЛ та багатьох видів раку. Дим також шкодить зубам і яснам, а пасивне куріння небезпечне для людей поруч, особливо для дітей.',
  sourceName: 'CDC — Cigarette Smoking',
  sourceUrl: 'https://www.cdc.gov/tobacco/about/index.html',
}

const heatedTobaccoInsight: HealthInsight = {
  title: 'Нагрівання тютюну не робить його безпечним',
  summary: 'Стіки містять нікотин і підтримують залежність; їхні викиди не є безпечними.',
  body:
    'Нагрівальні тютюнові вироби містять нікотин, який викликає залежність, та інші шкідливі речовини. Вони відносно нові, тому їхні коротко- й довгострокові наслідки ще продовжують вивчати.',
  sourceName: 'CDC — Heated Tobacco Products',
  sourceUrl: 'https://www.cdc.gov/tobacco/other-tobacco-products/heated-tobacco-products.html',
}

const vapeInsight: HealthInsight = {
  title: 'Аерозоль — не просто водяна пара',
  summary: 'Вейп може підтримувати нікотинову залежність і переносити дрібні частинки в легені.',
  body:
    'Більшість електронних сигарет містять нікотин. Їхній аерозоль може містити шкідливі або потенційно шкідливі речовини, зокрема дрібні частинки, які вдихаються глибоко в легені.',
  sourceName: 'CDC — Health Effects of Vaping',
  sourceUrl: 'https://www.cdc.gov/tobacco/e-cigarettes/health-effects.html',
}

const tobaccoSnusInsight: HealthInsight = {
  title: 'Рот, ясна та тютюн без диму',
  summary: 'Відсутність диму не прибирає залежність і ризики самого тютюну.',
  body:
    'Бездимний тютюн містить нікотин і викликає залежність. Такі продукти пов’язані з ураженням рота й ясен та спричиняють рак рота, стравоходу і підшлункової залози.',
  sourceName: 'CDC — Smokeless Tobacco Health Effects',
  sourceUrl: 'https://www.cdc.gov/tobacco/other-tobacco-products/smokeless-tobacco-health-effects.html',
}

const nicotinePouchInsight: HealthInsight = {
  title: 'Нікотин і залежність',
  summary: 'Паучі не містять тютюнового листа, але нікотин продовжує підтримувати залежність.',
  body:
    'Нікотинові паучі містять нікотин, який викликає залежність. Ці продукти відносно нові, тому вчені ще вивчають їхні коротко- та довгострокові наслідки для здоров’я.',
  sourceName: 'CDC — Nicotine Pouches',
  sourceUrl: 'https://www.cdc.gov/tobacco/nicotine-pouches/index.html',
}

export function healthInsightForProduct(product: Product | undefined): HealthInsight {
  if (!product || product.category === 'cigarette') return cigaretteInsight
  if (product.category === 'stick') return heatedTobaccoInsight
  if (product.category === 'vape') return vapeInsight
  if (product.snusKind === 'tobacco') return tobaccoSnusInsight
  return nicotinePouchInsight
}
