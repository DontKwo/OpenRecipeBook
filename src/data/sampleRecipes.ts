import type { Recipe } from "../domain/recipe/types";

export const SAMPLE_RECIPES: Recipe[] = [
  {
    id: "sample-pancakes",
    title: "Classic Buttermilk Pancakes",
    description: "Fluffy, golden pancakes made from scratch with real buttermilk.",
    servings: 4,
    servingsLabel: "servings",
    prepMinutes: 10,
    cookMinutes: 15,
    totalMinutes: 25,
    ingredientGroups: [
      {
        heading: "Dry Ingredients",
        items: [
          { id: "p-ing-1", raw: "2 cups all-purpose flour", scalable: true },
          { id: "p-ing-2", raw: "2 tbsp granulated sugar", scalable: true },
          { id: "p-ing-3", raw: "2 tsp baking powder", scalable: true },
          { id: "p-ing-4", raw: "1/2 tsp baking soda", scalable: true },
          { id: "p-ing-5", raw: "1/2 tsp salt", scalable: true }
        ]
      },
      {
        heading: "Wet Ingredients",
        items: [
          { id: "p-ing-6", raw: "2 cups whole milk", scalable: true },
          { id: "p-ing-7", raw: "2 eggs", scalable: true },
          { id: "p-ing-8", raw: "1/4 cup unsalted butter, melted", scalable: true }
        ]
      }
    ],
    directionGroups: [
      {
        steps: [
          { id: "p-s-1", text: "Whisk flour, sugar, baking powder, baking soda, and salt together in large bowl." },
          { id: "p-s-2", text: "In separate bowl, whisk milk, eggs, and melted butter until combined." },
          { id: "p-s-3", text: "Pour wet ingredients into dry mixture and stir gently until just combined with small lumps remaining." },
          { id: "p-s-4", text: "Heat lightly oiled griddle over medium heat. Pour 1/4 cup batter per pancake." },
          { id: "p-s-5", text: "Cook 2 to 3 minutes until bubbles burst on surface, flip, and cook 1 to 2 minutes more until golden brown." }
        ]
      }
    ],
    notes: "Do not overmix the batter to keep pancakes tender and fluffy.",
    cookLog: [],
    courses: ["Breakfast"],
    categories: ["Pancakes & Waffles"],
    collectionIds: [],
    tags: ["quick", "breakfast", "weekend"],
    rating: 5,
    favorite: true,
    photoIds: [],
    createdAt: "2026-11-11T12:00:00Z",
    updatedAt: "2026-11-11T12:00:00Z",
    schemaVersion: 1
  },
  {
    id: "sample-chili",
    title: "Weeknight Three-Bean Chili",
    description: "Hearty vegetarian chili packed with black beans, diced tomatoes, and warm spices.",
    servings: 6,
    servingsLabel: "servings",
    prepMinutes: 15,
    cookMinutes: 30,
    totalMinutes: 45,
    ingredientGroups: [
      {
        items: [
          { id: "c-ing-1", raw: "2 tbsp olive oil", scalable: true },
          { id: "c-ing-2", raw: "1 yellow onion, diced", scalable: true },
          { id: "c-ing-3", raw: "3 cloves garlic, minced", scalable: true },
          { id: "c-ing-4", raw: "2 tbsp chili powder", scalable: true },
          { id: "c-ing-5", raw: "1 tbsp ground cumin", scalable: true },
          { id: "c-ing-6", raw: "2 (14 oz) cans diced tomatoes", scalable: true },
          { id: "c-ing-7", raw: "2 (14 oz) cans black beans", scalable: true },
          { id: "c-ing-8", raw: "2 cups vegetable broth", scalable: true },
          { id: "c-ing-9", raw: "1 tsp salt", scalable: true }
        ]
      }
    ],
    directionGroups: [
      {
        steps: [
          { id: "c-s-1", text: "Heat olive oil in large pot over medium heat." },
          { id: "c-s-2", text: "Add onion and cook 5 minutes until soft. Stir in garlic, chili powder, and cumin for 1 minute until fragrant." },
          { id: "c-s-3", text: "Add diced tomatoes, black beans, vegetable broth, and salt. Bring to simmer." },
          { id: "c-s-4", text: "Simmer uncovered for 25 minutes until chili thickens to desired consistency." }
        ]
      }
    ],
    notes: "Serve with sour cream, cheddar cheese, and sliced green onions.",
    cookLog: [],
    courses: ["Dinner"],
    categories: ["Soups & Stews"],
    collectionIds: [],
    tags: ["vegetarian", "one-pot", "comfort-food"],
    rating: 4,
    favorite: false,
    photoIds: [],
    createdAt: "2026-11-11T12:00:00Z",
    updatedAt: "2026-11-11T12:00:00Z",
    schemaVersion: 1
  },
  {
    id: "sample-pasta",
    title: "Fresh Basil Pesto Pasta",
    description: "Tender pasta tossed in bright homemade pesto with fresh basil and parmesan.",
    servings: 4,
    servingsLabel: "servings",
    prepMinutes: 10,
    cookMinutes: 10,
    totalMinutes: 20,
    ingredientGroups: [
      {
        items: [
          { id: "pst-ing-1", raw: "1 lb pasta", scalable: true },
          { id: "pst-ing-2", raw: "2 cups fresh basil", scalable: true },
          { id: "pst-ing-3", raw: "2 cloves garlic", scalable: true },
          { id: "pst-ing-4", raw: "1/2 cup olive oil", scalable: true },
          { id: "pst-ing-5", raw: "1/2 cup parmesan cheese", scalable: true },
          { id: "pst-ing-6", raw: "1/2 tsp salt", scalable: true }
        ]
      }
    ],
    directionGroups: [
      {
        steps: [
          { id: "pst-s-1", text: "Bring large pot of salted water to boil. Cook pasta until al dente." },
          { id: "pst-s-2", text: "Pulse basil and garlic in food processor until finely minced." },
          { id: "pst-s-3", text: "With motor running, slowly stream in olive oil until emulsified." },
          { id: "pst-s-4", text: "Transfer pesto to bowl and stir in grated parmesan cheese and salt." },
          { id: "pst-s-5", text: "Drain pasta, reserving 1/4 cup cooking water, and toss pasta with fresh pesto." }
        ]
      }
    ],
    cookLog: [],
    courses: ["Lunch", "Dinner"],
    categories: ["Pasta"],
    collectionIds: [],
    tags: ["quick", "italian", "fresh"],
    rating: 5,
    favorite: true,
    photoIds: [],
    createdAt: "2026-11-11T12:00:00Z",
    updatedAt: "2026-11-11T12:00:00Z",
    schemaVersion: 1
  },
  {
    id: "sample-cookies",
    title: "Chewy Chocolate Chip Cookies",
    description: "Buttery, golden cookies with crisp edges and soft centers packed with semi-sweet chocolate.",
    servings: 24,
    servingsLabel: "cookies",
    prepMinutes: 15,
    cookMinutes: 10,
    totalMinutes: 25,
    ingredientGroups: [
      {
        items: [
          { id: "ck-ing-1", raw: "2 1/4 cups all-purpose flour", scalable: true },
          { id: "ck-ing-2", raw: "1 tsp baking soda", scalable: true },
          { id: "ck-ing-3", raw: "1 tsp salt", scalable: true },
          { id: "ck-ing-4", raw: "1 cup unsalted butter, softened", scalable: true },
          { id: "ck-ing-5", raw: "3/4 cup granulated sugar", scalable: true },
          { id: "ck-ing-6", raw: "3/4 cup brown sugar", scalable: true },
          { id: "ck-ing-7", raw: "2 eggs", scalable: true },
          { id: "ck-ing-8", raw: "1 tsp vanilla extract", scalable: true },
          { id: "ck-ing-9", raw: "2 cups chocolate chips", scalable: true }
        ]
      }
    ],
    directionGroups: [
      {
        steps: [
          { id: "ck-s-1", text: "Preheat oven to 375\u00B0F. Line two large baking sheets with parchment paper." },
          { id: "ck-s-2", text: "Combine flour, baking soda, and salt in small bowl." },
          { id: "ck-s-3", text: "Beat softened butter, granulated sugar, and brown sugar until creamy." },
          { id: "ck-s-4", text: "Add eggs one at a time, beating well after each addition, then stir in vanilla extract." },
          { id: "ck-s-5", text: "Gradually blend in flour mixture. Fold in chocolate chips." },
          { id: "ck-s-6", text: "Drop rounded tablespoons onto baking sheets. Bake 9 to 11 minutes until golden brown." }
        ]
      }
    ],
    notes: "Cool on baking sheets for 2 minutes before transferring to wire racks.",
    cookLog: [],
    courses: ["Dessert"],
    categories: ["Cookies"],
    collectionIds: [],
    tags: ["baking", "dessert", "classic"],
    rating: 5,
    favorite: true,
    photoIds: [],
    createdAt: "2026-11-11T12:00:00Z",
    updatedAt: "2026-11-11T12:00:00Z",
    schemaVersion: 1
  }
];
