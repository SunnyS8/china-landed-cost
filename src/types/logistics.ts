export type DestinationWarehouse = 'Серпухов' | 'Ставрополь';

export type ContainerSize = '20GP' | '40HC';

export type RouteType = 
  | 'sea_vvo_rail_truck' // Шанхай/Нинбо -> Море ВВО -> ЖД Москва/Ростов -> Авто
  | 'direct_rail_truck'  // Шанхай -> Прямое ЖД -> Москва/Краснодар/Тимашевск -> Авто
  | 'deep_sea_novorossiysk'; // Шанхай/Нинбо -> Море Новороссийск -> Авто

export type Currency = 'USD' | 'EUR' | 'CNY' | 'RUB';

export interface CostComponent {
  amount: number;
  currency: Currency;
}

export interface ForwarderQuote {
  id: string;
  forwarderName: string;
  destination: DestinationWarehouse;
  originPort: string;
  routeType: RouteType;
  routeDescription: string;
  transitHub: string;
  containerSize: ContainerSize;
  weightTons: number;
  maxWeightTons: number;
  overweightRateRub: number;
  vatRate: number;
  oceanFreight: CostComponent;
  railFreight: CostComponent;
  truckDelivery: CostComponent;
  forwarderFee: CostComponent;
  terminalExpenses: CostComponent;
  transitDaysMin: number;
  transitDaysMax: number;
  equipment: string;
  validUntil: string;
  comments?: string;
  favorite?: boolean;
  note?: string;
}

export interface ProductQuote {
  id: string;
  supplier: string;
  hsCode: string;
  pricePerM2CNY: number;
  pricePerBoxCNY: number;
  customsRate: number;
  vatRate: number;
  containerM2: number;
  weightPerM: number;
  containerWeightKg: number;
  note?: string;
}

export interface LandedCost {
  productRUB: number;
  productPerM2: number;
  customsRUB: number;
  customsPerM2: number;
  freightRUB: number;
  deliveryRUB: number;
  otherRUB: number;
  freightPerM2: number;
  vatRUB: number;
  totalRUB: number;
  totalPerM2: number;
  totalPerKg: number;
}

export interface ExchangeRates {
  usdRub: number;
  eurRub: number;
  cnyRub: number;
}

export interface ExchangeRateConfig {
  usdRubRate: number;
  eurRubRate: number;
  cnyRubRate: number;
  date: string;
  source: string;
}
