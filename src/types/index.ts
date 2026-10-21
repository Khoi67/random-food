export type MealType = 'sang' | 'trua' | 'toi';

export type PriceRange = 'under50' | '50to100' | 'above100';

export type DishType = 'nuoc' | 'kho';

export interface LocationItem {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  directionUrl?: string;
}

export interface ReviewItem {
  id: string;
  author: string;
  stars: number;
  comment: string;
  createdAt: number;
}

export interface Dish {
  id: string;
  name: string;
  shortName?: string;
  meal?: MealType; // backward compatibility
  mealTypes?: MealType[];
  priceRange?: PriceRange;
  type?: DishType;
  vegetarian?: boolean;
  tags?: string[];
  locations?: LocationItem[];
  reviews?: ReviewItem[];
  status?: 'approved' | 'pending' | 'rejected';
  createdAt?: number;
  updatedAt?: number;
}

export interface FilterState {
  price: 'all' | PriceRange;
  dishType: 'all' | DishType;
  vegOnly: boolean;
}

export interface SpinHistoryItem {
  id: string;
  dishId: string;
  dishName: string;
  mealType: MealType;
  timestamp: number;
}

export interface WeightedSlice {
  dish: Dish;
  index: number;
  weight: number;
  isFav: boolean;
  startAngle: number;
  endAngle: number;
  centerAngle: number;
  span: number;
}
