import { CostComponent, ExchangeRates, ForwarderQuote, ProductQuote, LandedCost } from '../types/logistics';

export interface CalculatedCost {
  totalUsd: number;
  totalRub: number;
  oceanFreightUsd: number;
  oceanFreightRub: number;
  railFreightUsd: number;
  railFreightRub: number;
  truckDeliveryUsd: number;
  truckDeliveryRub: number;
  forwarderFeeUsd: number;
  forwarderFeeRub: number;
  terminalExpensesUsd: number;
  terminalExpensesRub: number;
  overweightRub: number;
  overweightUsd: number;
  vatRub: number;
  vatUsd: number;
  totalWithVatUsd: number;
  totalWithVatRub: number;
  totalWithoutVatUsd: number;
  totalWithoutVatRub: number;
}

export function toRub(comp: CostComponent, rates: ExchangeRates): number {
  switch (comp.currency) {
    case 'RUB': return comp.amount;
    case 'EUR': return comp.amount * rates.eurRub;
    case 'CNY': return comp.amount * rates.cnyRub;
    case 'USD':
    default: return comp.amount * rates.usdRub;
  }
}

export function toUsd(comp: CostComponent, rates: ExchangeRates): number {
  return rates.usdRub > 0 ? toRub(comp, rates) / rates.usdRub : 0;
}

export function calcOverweightRub(quote: ForwarderQuote): number {
  const overweight = quote.weightTons - quote.maxWeightTons;
  if (overweight <= 0 || quote.overweightRateRub <= 0) return 0;
  return Math.ceil(overweight) * quote.overweightRateRub;
}

export function calculateQuoteCost(quote: ForwarderQuote, rates: ExchangeRates): CalculatedCost {
  const vatRate = quote.vatRate / 100;

  const oceanUsd = toUsd(quote.oceanFreight, rates);
  const oceanRub = oceanUsd * rates.usdRub;

  const railUsd = toUsd(quote.railFreight, rates);
  const truckUsd = toUsd(quote.truckDelivery, rates);
  const feeUsd = toUsd(quote.forwarderFee, rates);
  const termUsd = toUsd(quote.terminalExpenses, rates);

  const overweightRub = calcOverweightRub(quote);
  const overweightUsd = rates.usdRub > 0 ? overweightRub / rates.usdRub : 0;

  const domesticServicesRub = (railUsd + truckUsd + feeUsd + termUsd) * rates.usdRub;
  const baseUsd = oceanUsd + railUsd + truckUsd + feeUsd + termUsd;

  const vatRub = domesticServicesRub * vatRate;
  const vatUsd = vatRub / rates.usdRub;

  const totalWithoutVatUsd = baseUsd + overweightUsd;
  const totalWithoutVatRub = totalWithoutVatUsd * rates.usdRub;
  const totalWithVatUsd = totalWithoutVatUsd + vatUsd;
  const totalWithVatRub = totalWithoutVatRub + vatRub;

  return {
    totalUsd: Math.round(totalWithVatUsd),
    totalRub: Math.round(totalWithVatRub),
    oceanFreightUsd: Math.round(oceanUsd),
    oceanFreightRub: Math.round(oceanRub),
    railFreightUsd: Math.round(railUsd),
    railFreightRub: Math.round(railUsd * rates.usdRub),
    truckDeliveryUsd: Math.round(truckUsd),
    truckDeliveryRub: Math.round(truckUsd * rates.usdRub),
    forwarderFeeUsd: Math.round(feeUsd),
    forwarderFeeRub: Math.round(feeUsd * rates.usdRub),
    terminalExpensesUsd: Math.round(termUsd),
    terminalExpensesRub: Math.round(termUsd * rates.usdRub),
    overweightRub: Math.round(overweightRub),
    overweightUsd: Math.round(overweightUsd),
    vatRub: Math.round(vatRub),
    vatUsd: Math.round(vatUsd),
    totalWithVatUsd: Math.round(totalWithVatUsd),
    totalWithVatRub: Math.round(totalWithVatRub),
    totalWithoutVatUsd: Math.round(totalWithoutVatUsd),
    totalWithoutVatRub: Math.round(totalWithoutVatRub),
  };
}

export function calculateLandedCost(
  product: ProductQuote,
  logisticsRUB: { freight: number; delivery: number; other: number },
  rates: ExchangeRates,
): LandedCost {
  const productRUB = product.pricePerM2CNY * rates.cnyRub * product.containerM2;
  const productPerM2 = product.pricePerM2CNY * rates.cnyRub;

  const customsBase = productRUB + logisticsRUB.freight;
  const customsRUB = customsBase * (product.customsRate / 100);
  const customsPerM2 = customsRUB / product.containerM2;

  const freightPerM2 = logisticsRUB.freight / product.containerM2;

  const vatBase = customsRUB + logisticsRUB.delivery + logisticsRUB.other;
  const vatRUB = vatBase * (product.vatRate / 100);

  const totalRUB = productRUB + customsRUB + logisticsRUB.freight + logisticsRUB.delivery + logisticsRUB.other + vatRUB;
  const totalPerM2 = totalRUB / product.containerM2;
  const totalPerKg = totalRUB / product.containerWeightKg;

  return {
    productRUB: Math.round(productRUB),
    productPerM2: Math.round(productPerM2),
    customsRUB: Math.round(customsRUB),
    customsPerM2: Math.round(customsPerM2),
    freightRUB: Math.round(logisticsRUB.freight),
    deliveryRUB: Math.round(logisticsRUB.delivery),
    otherRUB: Math.round(logisticsRUB.other),
    freightPerM2: Math.round(freightPerM2),
    vatRUB: Math.round(vatRUB),
    totalRUB: Math.round(totalRUB),
    totalPerM2: Math.round(totalPerM2),
    totalPerKg: Math.round(totalPerKg),
  };
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRUB(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}
