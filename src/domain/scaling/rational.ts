export interface Rational {
  numerator: number;
  denominator: number;
}

export function computeGcd(firstValue: number, secondValue: number): number {
  let currentA = Math.abs(firstValue);
  let currentB = Math.abs(secondValue);
  while (currentB > 0) {
    const temporaryValue = currentB;
    currentB = currentA % currentB;
    currentA = temporaryValue;
  }
  return currentA || 1;
}

export function createRational(numerator: number, denominator: number = 1): Rational {
  if (denominator === 0) {
    throw new Error("Denominator cannot be zero");
  }
  const divisor = computeGcd(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  return {
    numerator: (numerator / divisor) * sign,
    denominator: Math.abs(denominator / divisor)
  };
}

export function rationalFromNumber(value: number, maxDenominator: number = 64): Rational {
  if (Number.isInteger(value)) {
    return createRational(value, 1);
  }
  let bestNumerator = 1;
  let bestDenominator = 1;
  let smallestDifference = Math.abs(value - bestNumerator / bestDenominator);

  for (let candidateDenominator = 1; candidateDenominator <= maxDenominator; candidateDenominator += 1) {
    const candidateNumerator = Math.round(value * candidateDenominator);
    const difference = Math.abs(value - candidateNumerator / candidateDenominator);
    if (difference < smallestDifference) {
      smallestDifference = difference;
      bestNumerator = candidateNumerator;
      bestDenominator = candidateDenominator;
      if (difference < 1e-6) {
        break;
      }
    }
  }

  return createRational(bestNumerator, bestDenominator);
}

export function rationalToNumber(item: Rational): number {
  return item.numerator / item.denominator;
}

export function addRationals(firstItem: Rational, secondItem: Rational): Rational {
  const commonDenominator = firstItem.denominator * secondItem.denominator;
  const combinedNumerator =
    firstItem.numerator * secondItem.denominator +
    secondItem.numerator * firstItem.denominator;
  return createRational(combinedNumerator, commonDenominator);
}

export function multiplyRational(item: Rational, multiplier: number | Rational): Rational {
  if (typeof multiplier === "number") {
    const multiplierRational = rationalFromNumber(multiplier);
    return createRational(
      item.numerator * multiplierRational.numerator,
      item.denominator * multiplierRational.denominator
    );
  }
  return createRational(
    item.numerator * multiplier.numerator,
    item.denominator * multiplier.denominator
  );
}
