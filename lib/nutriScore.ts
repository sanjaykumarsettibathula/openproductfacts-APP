export interface NutritionalInfo {
  energy_kj?: number;
  energy_kcal?: number;
  sugars?: number;
  saturated_fat?: number;
  salt?: number;
  fiber?: number;
  protein?: number;
  fruits_vegetables_nuts_percentage?: number;
}

export interface NutriScoreDetails {
  negative_points: number;
  positive_points: number;
  energy_points: number;
  sugar_points: number;
  saturated_fat_points: number;
  salt_points: number;
  fiber_points: number;
  protein_points: number;
  fruits_vegetables_nuts_points: number;
}

function getEmptyNutriScoreDetails(): NutriScoreDetails {
  return {
    negative_points: 0,
    positive_points: 0,
    energy_points: 0,
    sugar_points: 0,
    saturated_fat_points: 0,
    salt_points: 0,
    fiber_points: 0,
    protein_points: 0,
    fruits_vegetables_nuts_points: 0,
  };
}

function calculateEnergyPoints(energyKj: number): number {
  if (energyKj <= 335) return 0;
  if (energyKj <= 670) return 1;
  if (energyKj <= 1005) return 2;
  if (energyKj <= 1340) return 3;
  if (energyKj <= 1675) return 4;
  if (energyKj <= 2010) return 5;
  if (energyKj <= 2345) return 6;
  if (energyKj <= 2680) return 7;
  if (energyKj <= 3015) return 8;
  if (energyKj <= 3350) return 9;
  return 10;
}

function calculateSugarPoints(sugars: number): number {
  if (sugars <= 4.5) return 0;
  if (sugars <= 9) return 1;
  if (sugars <= 13.5) return 2;
  if (sugars <= 18) return 3;
  if (sugars <= 22.5) return 4;
  if (sugars <= 27) return 5;
  if (sugars <= 31.5) return 6;
  if (sugars <= 36) return 7;
  if (sugars <= 40.5) return 8;
  if (sugars <= 45) return 9;
  if (sugars <= 50) return 10;
  if (sugars <= 55) return 11;
  if (sugars <= 60) return 12;
  if (sugars <= 63) return 13;
  if (sugars <= 67) return 14;
  return 15;
}

function calculateSaturatedFatPoints(saturatedFat: number): number {
  if (saturatedFat <= 1) return 0;
  if (saturatedFat <= 2) return 1;
  if (saturatedFat <= 3) return 2;
  if (saturatedFat <= 4) return 3;
  if (saturatedFat <= 5) return 4;
  if (saturatedFat <= 6) return 5;
  if (saturatedFat <= 7) return 6;
  if (saturatedFat <= 8) return 7;
  if (saturatedFat <= 9) return 8;
  if (saturatedFat <= 10) return 9;
  return 10;
}

function calculateSaltPoints(salt: number): number {
  const sodium = salt / 2.5;
  if (sodium <= 90) return 0;
  if (sodium <= 180) return 1;
  if (sodium <= 270) return 2;
  if (sodium <= 360) return 3;
  if (sodium <= 450) return 4;
  if (sodium <= 540) return 5;
  if (sodium <= 630) return 6;
  if (sodium <= 720) return 7;
  if (sodium <= 810) return 8;
  if (sodium <= 900) return 9;
  return 10;
}

function calculateFiberPoints(fiber: number): number {
  if (fiber >= 4.7) return 5;
  if (fiber >= 3.7) return 4;
  if (fiber >= 2.8) return 3;
  if (fiber >= 1.9) return 2;
  if (fiber >= 0.9) return 1;
  return 0;
}

function calculateProteinPoints(protein: number): number {
  if (protein >= 8.0) return 5;
  if (protein >= 6.4) return 4;
  if (protein >= 4.8) return 3;
  if (protein >= 3.2) return 2;
  if (protein >= 1.6) return 1;
  return 0;
}

function calculateFruitsVegetablesNutsPoints(percentage: number): number {
  if (percentage >= 80) return 5;
  if (percentage >= 60) return 4;
  if (percentage >= 40) return 3;
  if (percentage >= 20) return 2;
  if (percentage >= 10) return 1;
  return 0;
}

export function calculateNutriScore(nutritionalInfo: NutritionalInfo | null): NutriScoreDetails {
  if (!nutritionalInfo) return getEmptyNutriScoreDetails();

  const energy_kj = nutritionalInfo.energy_kj || (nutritionalInfo.energy_kcal ? nutritionalInfo.energy_kcal * 4.184 : 0);
  const sugars = nutritionalInfo.sugars || 0;
  const saturatedFat = nutritionalInfo.saturated_fat || 0;
  const salt = nutritionalInfo.salt || 0;
  const fiber = nutritionalInfo.fiber || 0;
  const protein = nutritionalInfo.protein || 0;
  const fruitsVegetablesNuts = nutritionalInfo.fruits_vegetables_nuts_percentage || 0;

  const energyPoints = calculateEnergyPoints(energy_kj);
  const sugarPoints = calculateSugarPoints(sugars);
  const saturatedFatPoints = calculateSaturatedFatPoints(saturatedFat);
  const saltPoints = calculateSaltPoints(salt);
  const negativePoints = energyPoints + sugarPoints + saturatedFatPoints + saltPoints;

  const fiberPoints = calculateFiberPoints(fiber);
  const proteinPoints = calculateProteinPoints(protein);
  const fruitsVegetablesNutsPoints = calculateFruitsVegetablesNutsPoints(fruitsVegetablesNuts);
  const positivePoints = fiberPoints + proteinPoints + fruitsVegetablesNutsPoints;

  return {
    negative_points: negativePoints,
    positive_points: positivePoints,
    energy_points: energyPoints,
    sugar_points: sugarPoints,
    saturated_fat_points: saturatedFatPoints,
    salt_points: saltPoints,
    fiber_points: fiberPoints,
    protein_points: proteinPoints,
    fruits_vegetables_nuts_points: fruitsVegetablesNutsPoints,
  };
}

export function getNutriScoreGrade(details: NutriScoreDetails): string {
  const score = details.negative_points - details.positive_points;
  if (score <= -1) return 'A';
  if (score <= 2) return 'B';
  if (score <= 10) return 'C';
  if (score <= 18) return 'D';
  return 'E';
}
