import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterDishes } from '../src/utils/filterLogic.js';
import { computeWeightedSlices, pickWeightedWinner } from '../src/utils/randomLogic.js';

describe('Logic Lọc Món Ăn (filterDishes)', () => {
  const sampleDishes = [
    {
      id: 'dish-1',
      name: 'Cơm tấm Ba Ghiền',
      mealTypes: ['sang', 'trua'],
      status: 'approved',
      priceRange: '50to100',
      type: 'kho',
      vegetarian: false
    },
    {
      id: 'dish-2',
      name: 'Phở bò Lệ',
      mealTypes: ['sang', 'toi'],
      status: 'approved',
      priceRange: 'under50',
      type: 'nuoc',
      vegetarian: false
    },
    {
      id: 'dish-3',
      name: 'Hủ tiếu chay Sa Đéc',
      mealTypes: ['sang', 'trua', 'toi'],
      status: 'approved',
      priceRange: 'under50',
      type: 'nuoc',
      vegetarian: true
    },
    {
      id: 'dish-4',
      name: 'Lẩu bò cao cấp',
      mealTypes: ['toi'],
      status: 'approved',
      priceRange: 'above100',
      type: 'nuoc',
      vegetarian: false
    },
    {
      id: 'dish-5',
      name: 'Món chưa duyệt',
      mealTypes: ['sang'],
      status: 'pending',
      priceRange: 'under50',
      type: 'kho',
      vegetarian: false
    },
    {
      id: 'dish-6',
      name: 'Món cũ không có status',
      mealTypes: ['trua'],
      priceRange: '50to100',
      type: 'kho',
      vegetarian: false
    }
  ];

  it('lọc chính xác theo bữa ăn (Sáng, Trưa, Tối)', () => {
    const sang = filterDishes(sampleDishes, { currentMeal: 'sang' });
    const trua = filterDishes(sampleDishes, { currentMeal: 'trua' });
    const toi = filterDishes(sampleDishes, { currentMeal: 'toi' });

    assert.deepEqual(sang.map(d => d.id), ['dish-1', 'dish-2', 'dish-3']);
    assert.deepEqual(trua.map(d => d.id), ['dish-1', 'dish-3', 'dish-6']);
    assert.deepEqual(toi.map(d => d.id), ['dish-2', 'dish-3', 'dish-4']);
  });

  it('loại trừ món chưa được duyệt (status !== approved)', () => {
    const res = filterDishes(sampleDishes, { currentMeal: 'sang' });
    assert.equal(res.some(d => d.id === 'dish-5'), false);
  });

  it('hỗ trợ món mặc định cũ không có trường status', () => {
    const res = filterDishes(sampleDishes, { currentMeal: 'trua' });
    assert.equal(res.some(d => d.id === 'dish-6'), true);
  });

  it('tạm loại món hôm nay với excludedDishIds', () => {
    const excluded = new Set(['dish-1']);
    const res = filterDishes(sampleDishes, { currentMeal: 'sang', excludedDishIds: excluded });
    assert.deepEqual(res.map(d => d.id), ['dish-2', 'dish-3']);
  });

  it('tránh lặp lại món đã ăn gần đây (recentlyEatenIds)', () => {
    const recentlyEaten = new Set(['dish-2']);
    const res = filterDishes(sampleDishes, { currentMeal: 'sang', recentlyEatenIds: recentlyEaten });
    assert.deepEqual(res.map(d => d.id), ['dish-1', 'dish-3']);
  });

  it('lọc theo khoảng giá (price: under50, 50to100, above100)', () => {
    const under50 = filterDishes(sampleDishes, {
      currentMeal: 'sang',
      filters: { price: 'under50', dishType: 'all', vegOnly: false }
    });
    assert.deepEqual(under50.map(d => d.id), ['dish-2', 'dish-3']);

    const mid50to100 = filterDishes(sampleDishes, {
      currentMeal: 'sang',
      filters: { price: '50to100', dishType: 'all', vegOnly: false }
    });
    assert.deepEqual(mid50to100.map(d => d.id), ['dish-1']);
  });

  it('lọc theo kiểu món nước / khô (dishType: nuoc, kho)', () => {
    const nuoc = filterDishes(sampleDishes, {
      currentMeal: 'sang',
      filters: { price: 'all', dishType: 'nuoc', vegOnly: false }
    });
    assert.deepEqual(nuoc.map(d => d.id), ['dish-2', 'dish-3']);

    const kho = filterDishes(sampleDishes, {
      currentMeal: 'sang',
      filters: { price: 'all', dishType: 'kho', vegOnly: false }
    });
    assert.deepEqual(kho.map(d => d.id), ['dish-1']);
  });

  it('lọc món chay (vegOnly: true)', () => {
    const veg = filterDishes(sampleDishes, {
      currentMeal: 'sang',
      filters: { price: 'all', dishType: 'all', vegOnly: true }
    });
    assert.deepEqual(veg.map(d => d.id), ['dish-3']);
  });

  it('kết hợp đồng thời nhiều bộ lọc', () => {
    const combined = filterDishes(sampleDishes, {
      currentMeal: 'sang',
      filters: { price: 'under50', dishType: 'nuoc', vegOnly: true }
    });
    assert.deepEqual(combined.map(d => d.id), ['dish-3']);
  });
});

describe('Logic Vòng Quay Có Trọng Số (randomLogic)', () => {
  const dishes = [
    { id: 'dish-A', name: 'Món Thường A' },
    { id: 'dish-B', name: 'Món Yêu Thích B' },
    { id: 'dish-C', name: 'Món Thường C' }
  ];

  it('xử lý mảng rỗng an toàn', () => {
    assert.deepEqual(computeWeightedSlices([]), []);
    assert.equal(pickWeightedWinner([]), null);
    assert.equal(pickWeightedWinner(null), null);
  });

  it('tính toán trọng số 2x cho món yêu thích và góc quay chuẩn 2*PI', () => {
    // dish-B là yêu thích -> weights: A=1, B=2, C=1 (tổng = 4)
    const isFavFn = (id) => id === 'dish-B';
    const slices = computeWeightedSlices(dishes, isFavFn);

    assert.equal(slices.length, 3);
    assert.equal(slices[0].weight, 1);
    assert.equal(slices[1].weight, 2);
    assert.equal(slices[2].weight, 1);

    assert.equal(slices[0].isFav, false);
    assert.equal(slices[1].isFav, true);
    assert.equal(slices[2].isFav, false);

    // Tỉ lệ góc
    const totalSpan = slices.reduce((sum, s) => sum + s.span, 0);
    assert.ok(Math.abs(totalSpan - 2 * Math.PI) < 1e-9);

    // Lát B phải gấp đôi lát A
    assert.ok(Math.abs(slices[1].span - 2 * slices[0].span) < 1e-9);
  });

  it('chọn người chiến thắng xác định (deterministic) dựa trên tỷ lệ ngẫu nhiên inject', () => {
    // Tổng trọng số = 4:
    // [0..0.25) -> A
    // [0.25..0.75) -> B (2x)
    // [0.75..1.0] -> C
    const isFavFn = (id) => id === 'dish-B';
    const slices = computeWeightedSlices(dishes, isFavFn);

    assert.equal(pickWeightedWinner(slices, 0.1).dish.id, 'dish-A');
    assert.equal(pickWeightedWinner(slices, 0.3).dish.id, 'dish-B');
    assert.equal(pickWeightedWinner(slices, 0.7).dish.id, 'dish-B');
    assert.equal(pickWeightedWinner(slices, 0.85).dish.id, 'dish-C');
  });

  it('kiểm tra phân phối xác suất thống kê thực tế xấp xỉ 2:1 cho món yêu thích', () => {
    const isFavFn = (id) => id === 'dish-B';
    const slices = computeWeightedSlices(dishes, isFavFn);

    const counts = { 'dish-A': 0, 'dish-B': 0, 'dish-C': 0 };
    const iterations = 6000;

    for (let i = 0; i < iterations; i++) {
      const winner = pickWeightedWinner(slices, Math.random());
      counts[winner.dish.id]++;
    }

    // Với 6000 lượt: A ~ 1500 (25%), B ~ 3000 (50%), C ~ 1500 (25%)
    // Kiểm tra B trúng nhiều hơn đáng kể so với A và C (dung sai +/- 350)
    assert.ok(counts['dish-B'] > 2500 && counts['dish-B'] < 3500, `B count was ${counts['dish-B']}`);
    assert.ok(counts['dish-A'] > 1150 && counts['dish-A'] < 1850, `A count was ${counts['dish-A']}`);
    assert.ok(counts['dish-C'] > 1150 && counts['dish-C'] < 1850, `C count was ${counts['dish-C']}`);
  });
});
