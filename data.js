export const categories = [
  "Meat and Poultry",
  "Seafood",
  "Fresh Fruits",
  "Vegetable and Leafy Greens",
  "Spice and Condiments",
  "Beverages and Snacks",
  "Grains, Legumes and Pulses",
  "Tubers and Roots",
  "Nuts and Seeds",
  "Processed and Packaged Foods",
  "Beans Affairs"
];

export const categoryMap = new Map(
  categories.map((cat) => [cat.toLowerCase().replace(/\s+/g, ""), cat])
);
