/**
 * Calculate Nutri-Score points based on nutritional information per 100g
 * Based on the official Nutri-Score algorithm
 */

/**
 * Calculate negative points (energy, sugars, saturated fat, salt)
 */
export function calculateNutriScore(nutritionalInfo) {
  if (!nutritionalInfo) {
    return getEmptyNutriScoreDetails();
  }

  const energy_kj = nutritionalInfo.energy_kj || (nutritionalInfo.energy_kcal ? nutritionalInfo.energy_kcal * 4.184 : 0);
  const energy_kcal = nutritionalInfo.energy_kcal || (energy_kj ? energy_kj / 4.184 : 0);
  const sugars = nutritionalInfo.sugars || 0;
  const saturatedFat = nutritionalInfo.saturated_fat || 0;
  const salt = nutritionalInfo.salt || 0;
  const fiber = nutritionalInfo.fiber || 0;
  const protein = nutritionalInfo.protein || 0;
  const fruitsVegetablesNuts = nutritionalInfo.fruits_vegetables_nuts_percentage || 0;

  // Negative points calculation
  const energyPoints = calculateEnergyPoints(energy_kj);
  const sugarPoints = calculateSugarPoints(sugars);
  const saturatedFatPoints = calculateSaturatedFatPoints(saturatedFat);
  const saltPoints = calculateSaltPoints(salt);

  const negativePoints = energyPoints + sugarPoints + saturatedFatPoints + saltPoints;

  // Positive points calculation
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

/**
 * Calculate energy points (0-10 points)
 */
function calculateEnergyPoints(energyKj) {
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

/**
 * Calculate sugar points (0-15 points)
 */
function calculateSugarPoints(sugars) {
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

/**
 * Calculate saturated fat points (0-10 points)
 */
function calculateSaturatedFatPoints(saturatedFat) {
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

/**
 * Calculate salt points (0-20 points)
 * Note: Salt in grams, but calculation is based on sodium (salt = sodium * 2.5)
 */
function calculateSaltPoints(salt) {
  // Convert salt to sodium (salt = sodium * 2.5, so sodium = salt / 2.5)
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
  if (sodium <= 990) return 10;
  if (sodium <= 1080) return 11;
  if (sodium <= 1170) return 12;
  if (sodium <= 1260) return 13;
  if (sodium <= 1350) return 14;
  if (sodium <= 1440) return 15;
  if (sodium <= 1530) return 16;
  if (sodium <= 1620) return 17;
  if (sodium <= 1710) return 18;
  if (sodium <= 1800) return 19;
  return 20;
}

/**
 * Calculate fiber points (0-5 points)
 */
function calculateFiberPoints(fiber) {
  if (fiber >= 4.7) return 5;
  if (fiber >= 3.7) return 4;
  if (fiber >= 2.8) return 3;
  if (fiber >= 1.9) return 2;
  if (fiber >= 0.9) return 1;
  return 0;
}

/**
 * Calculate protein points (0-5 points)
 */
function calculateProteinPoints(protein) {
  if (protein >= 8.0) return 5;
  if (protein >= 6.4) return 4;
  if (protein >= 4.8) return 3;
  if (protein >= 3.2) return 2;
  if (protein >= 1.6) return 1;
  return 0;
}

/**
 * Calculate fruits, vegetables, and nuts points (0-5 points)
 */
function calculateFruitsVegetablesNutsPoints(percentage) {
  if (percentage >= 80) return 5;
  if (percentage >= 60) return 4;
  if (percentage >= 40) return 3;
  if (percentage >= 20) return 2;
  if (percentage >= 10) return 1;
  return 0;
}

/**
 * Get empty Nutri-Score details structure
 */
function getEmptyNutriScoreDetails() {
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

