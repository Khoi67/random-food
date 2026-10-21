/**
 * LOGIC LỌC MÓN ĂN THUẦN TÚY (Requirement 3.1 & 3.2 & 4.5)
 * Dễ dàng kiểm thử độc lập (Unit Test) và tái sử dụng.
 */

export function filterDishes(dishesList = [], {
  currentMeal = 'sang',
  excludedDishIds = new Set(),
  recentlyEatenIds = null,
  filters = { price: 'all', dishType: 'all', vegOnly: false }
} = {}) {
  const excludedSet = excludedDishIds instanceof Set ? excludedDishIds : new Set(excludedDishIds);
  const eatenSet = recentlyEatenIds instanceof Set ? recentlyEatenIds : (recentlyEatenIds ? new Set(recentlyEatenIds) : null);

  return dishesList.filter(d => {
    // 1. Khớp bữa ăn (Sáng, Trưa hoặc Tối)
    if (Array.isArray(d.mealTypes)) {
      if (!d.mealTypes.includes(currentMeal)) return false;
    } else if (d.meal && d.meal !== currentMeal) {
      return false;
    }

    // 2. Trạng thái kiểm duyệt (chỉ lấy approved hoặc món mặc định không có status)
    if (d.status && d.status !== 'approved') return false;

    // 3. Tạm loại khỏi vòng quay phiên hôm nay (Requirement 3.2)
    if (excludedSet.has(d.id)) return false;

    // 4. Tránh lặp lại món đã ăn trong N ngày gần đây (Requirement 3.2)
    if (eatenSet && eatenSet.has(d.id)) return false;

    // 5. Lọc theo khoảng giá: 'under50' | '50to100' | 'above100' (Requirement 3.1)
    if (filters.price && filters.price !== 'all') {
      if (d.priceRange && d.priceRange !== filters.price) return false;
    }

    // 6. Lọc theo dạng món: 'nuoc' | 'kho' (Requirement 3.1)
    if (filters.dishType && filters.dishType !== 'all') {
      if (d.type && d.type !== filters.dishType) return false;
    }

    // 7. Lọc món chay (Requirement 3.1)
    if (filters.vegOnly) {
      if (!d.vegetarian) return false;
    }

    return true;
  });
}
