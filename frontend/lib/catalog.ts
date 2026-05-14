import type { ClothingType, PricingCell, ServiceCategory } from '@/types'

export function serviceIcon(name: string) {
  const key = name.toLowerCase()
  if (key.includes('dry')) return 'Sparkles'
  if (key.includes('iron')) return 'Shirt'
  if (key.includes('steam')) return 'Waves'
  if (key.includes('wash')) return 'Droplets'
  return 'PackageCheck'
}

export function clothingIcon(name: string) {
  const key = name.toLowerCase()
  if (key.includes('pant')) return 'Rows3'
  if (key.includes('pajama')) return 'PanelTop'
  if (key.includes('suit')) return 'BriefcaseBusiness'
  if (key.includes('shoe')) return 'Footprints'
  if (key.includes('saree')) return 'Sparkle'
  return 'Shirt'
}

export function decorateCategories(categories: ServiceCategory[], pricing: PricingCell[]) {
  return categories.map((category) => {
    const prices = pricing.filter((cell) => cell.serviceCategoryId === category.id).map((cell) => Number(cell.price))
    return {
      ...category,
      icon: serviceIcon(category.name),
      startingPrice: prices.length ? Math.min(...prices) : 0
    }
  })
}

export function decorateClothingTypes(clothingTypes: ClothingType[]) {
  return clothingTypes.map((item) => ({
    ...item,
    icon: clothingIcon(item.name)
  }))
}
