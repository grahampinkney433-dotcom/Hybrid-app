import type { Food } from './types';

// Built-in food list, per 100 g. These ids MATCH the prototype's food ids exactly, so
// meal plans imported from a prototype backup still resolve to the right food.
// User-added foods live in the database (foods table); these ship in the app.
const RAW: [string, string, number, number, number, number][] = [
  ['oats', 'Oats', 379, 13, 60, 7],
  ['granola', 'Granola', 450, 10, 64, 17],
  ['gyog', 'Greek yoghurt 0%', 57, 10, 3.6, 0.4],
  ['skyr', 'Skyr', 63, 11, 4, 0.2],
  ['milk', 'Semi-skimmed milk', 46, 3.4, 4.7, 1.7],
  ['eggs', 'Eggs', 143, 12.6, 0.7, 9.5],
  ['whey', 'Whey protein', 400, 80, 8, 6],
  ['cottage', 'Cottage cheese', 98, 11, 3.4, 4.3],
  ['cheddar', 'Cheddar', 403, 25, 1.3, 33],
  ['chicken', 'Chicken breast (cooked)', 165, 31, 0, 3.6],
  ['turkey', 'Turkey mince 2% (raw)', 120, 23, 0, 2.5],
  ['beef', 'Beef mince 5% (raw)', 137, 21, 0, 5.5],
  ['salmon', 'Salmon fillet', 208, 20, 0, 13],
  ['cod', 'Cod', 82, 18, 0, 0.7],
  ['tuna', 'Tuna in water', 116, 26, 0, 1],
  ['tofu', 'Tofu', 144, 15, 3, 9],
  ['rice', 'White rice (cooked)', 130, 2.7, 28, 0.3],
  ['pasta', 'Pasta (cooked)', 158, 5.8, 31, 0.9],
  ['sweetpot', 'Sweet potato', 86, 1.6, 20, 0.1],
  ['potato', 'Potatoes', 77, 2, 17, 0.1],
  ['bread', 'Wholemeal bread', 247, 13, 41, 3.4],
  ['bagel', 'Bagel', 257, 10, 50, 1.5],
  ['ricecake', 'Rice cakes', 387, 8, 82, 3],
  ['lentils', 'Lentils (cooked)', 116, 9, 20, 0.4],
  ['chickpeas', 'Chickpeas (cooked)', 164, 8.9, 27, 2.6],
  ['banana', 'Banana', 89, 1.1, 23, 0.3],
  ['blueb', 'Blueberries', 57, 0.7, 14, 0.3],
  ['apple', 'Apple', 52, 0.3, 14, 0.2],
  ['broc', 'Broccoli', 34, 2.8, 7, 0.4],
  ['spinach', 'Spinach', 23, 2.9, 3.6, 0.4],
  ['peppers', 'Peppers', 31, 1, 6, 0.3],
  ['avo', 'Avocado', 160, 2, 9, 15],
  ['oil', 'Olive oil', 884, 0, 0, 100],
  ['pb', 'Peanut butter', 588, 25, 20, 50],
  ['almonds', 'Almonds', 579, 21, 22, 50],
  ['honey', 'Honey', 304, 0.3, 82, 0],
  ['gel', 'Energy gel', 250, 0, 62, 0],
  ['sportsdrink', 'Sports drink (per 100 ml)', 26, 0, 6.4, 0],
];

export const BUILT_IN_FOODS: Food[] = RAW.map(([id, name, kcal, protein, carbs, fat]) => ({
  id,
  name,
  kcal,
  protein,
  carbs,
  fat,
}));
