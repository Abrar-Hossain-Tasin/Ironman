import type { ClothingType, PricingCell, ServiceCategory } from '@/types'
import { formatBdt } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'

type PricingTableProps = {
  categories: ServiceCategory[]
  clothingTypes: ClothingType[]
  pricing: PricingCell[]
}

export function PricingTable({ categories, clothingTypes, pricing }: PricingTableProps) {
  const lookup = new Map(pricing.map((cell) => [`${cell.clothingTypeId}:${cell.serviceCategoryId}`, cell]))

  return (
    <div className="overflow-x-auto rounded-lg border border-ironman-navy-100 bg-white shadow-soft">
      <table className="min-w-[780px] w-full border-collapse text-sm">
        <thead className="bg-ironman-navy text-white">
          <tr>
            <th className="px-4 py-4 text-left font-semibold">Clothing</th>
            {categories.map((category) => (
              <th key={category.id} className="px-4 py-4 text-center font-semibold">
                {category.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clothingTypes.map((clothing, index) => (
            <tr key={clothing.id} className={index % 2 === 0 ? 'bg-white' : 'bg-ironman-navy-50'}>
              <th className="px-4 py-4 text-left font-semibold text-ironman-navy">
                <span className="inline-flex items-center gap-2">
                  <Icon name={clothing.icon ?? 'Shirt'} className="h-4 w-4 text-ironman-red" aria-hidden />
                  {clothing.name}
                </span>
              </th>
              {categories.map((category) => {
                const cell = lookup.get(`${clothing.id}:${category.id}`)
                return (
                  <td key={category.id} className="px-4 py-4 text-center font-semibold text-ironman-navy">
                    {cell ? formatBdt(cell.price) : <span className="text-gray-400">-</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
