import express from 'express';
import fs from 'node:fs';

let restaurants = [];

export function loadRestaurants(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  restaurants = JSON.parse(raw);
  console.log(`Loaded ${restaurants.length} restaurants from ${filePath}`);
  return restaurants;
}

export function getRestaurants() {
  return restaurants;
}

export function getRestaurantById(id) {
  return restaurants.find((r) => r.id === id) || null;
}

export const restaurantsRouter = express.Router();

restaurantsRouter.get('/', (req, res) => {
  res.json(restaurants);
});
