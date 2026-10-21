/**
 * LOGIC QUAY VÒNG CÓ TRỌNG SỐ THUẦN TÚY (Requirement 3.2 & 4.5)
 * - Món yêu thích có trọng số 2x (xác suất trúng gấp đôi món thường)
 * - Món thường có trọng số 1x
 * - Hàm chọn ngẫu nhiên có thể inject giá trị giả lập để kiểm thử 100% deterministic
 */

/**
 * Tính toán trọng số và góc lát cắt cho danh sách món
 */
export function computeWeightedSlices(dishes = [], isFavoriteFn = () => false) {
  if (!dishes || dishes.length === 0) return [];

  const weights = dishes.map(dish => (isFavoriteFn(dish.id) ? 2 : 1));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let accumulatedAngle = 0;
  return dishes.map((dish, i) => {
    const weight = weights[i];
    const span = (weight / totalWeight) * (2 * Math.PI);
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + span;
    const centerAngle = startAngle + (span / 2);
    accumulatedAngle = endAngle;

    return {
      dish,
      index: i,
      weight,
      isFav: weight > 1,
      startAngle,
      endAngle,
      centerAngle,
      span
    };
  });
}

/**
 * Chọn món trúng theo trọng số xác suất
 * @param {Array} slices - Mảng các lát cắt từ computeWeightedSlices
 * @param {number} randomRatio - Giá trị ngẫu nhiên từ 0 đến < 1 (mặc định Math.random())
 */
export function pickWeightedWinner(slices, randomRatio = Math.random()) {
  if (!slices || slices.length === 0) return null;

  const totalWeight = slices.reduce((sum, s) => sum + s.weight, 0);
  const targetWeight = randomRatio * totalWeight;

  let runningWeight = 0;
  for (let i = 0; i < slices.length; i++) {
    runningWeight += slices[i].weight;
    if (targetWeight <= runningWeight) {
      return slices[i];
    }
  }

  return slices[slices.length - 1];
}
