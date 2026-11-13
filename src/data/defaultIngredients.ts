import type { DictionaryIngredient } from "../domain/recipe/types";

export const BUILT_IN_INGREDIENTS: DictionaryIngredient[] = [
  // Baking & Grains
  {
    id: "all-purpose-flour",
    name: "all-purpose flour",
    aliases: ["flour", "ap flour", "white flour", "plain flour"],
    family: "flour",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.53,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "bread-flour",
    name: "bread flour",
    aliases: ["strong flour"],
    family: "flour",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.54,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "whole-wheat-flour",
    name: "whole wheat flour",
    aliases: ["graham flour"],
    family: "flour",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.51,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "granulated-sugar",
    name: "granulated sugar",
    aliases: ["sugar", "white sugar", "cane sugar"],
    family: "sugar",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.85,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "brown-sugar",
    name: "brown sugar",
    aliases: ["light brown sugar", "dark brown sugar"],
    family: "sugar",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.83,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "powdered-sugar",
    name: "powdered sugar",
    aliases: ["confectioners sugar", "icing sugar"],
    family: "sugar",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.56,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "baking-powder",
    name: "baking powder",
    aliases: [],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.90,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "baking-soda",
    name: "baking soda",
    aliases: ["sodium bicarbonate"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.92,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "active-dry-yeast",
    name: "active dry yeast",
    aliases: ["dry yeast", "instant yeast"],
    aisle: "Baking",
    unitFamily: "volume"
  },
  {
    id: "cocoa-powder",
    name: "cocoa powder",
    aliases: ["unsweetened cocoa powder", "dutch process cocoa"],
    aisle: "Baking",
    unitFamily: "volume"
  },
  {
    id: "chocolate-chips",
    name: "chocolate chips",
    aliases: ["semi-sweet chocolate chips", "dark chocolate chips"],
    aisle: "Baking",
    unitFamily: "volume"
  },
  {
    id: "vanilla-extract",
    name: "vanilla extract",
    aliases: ["pure vanilla extract", "vanilla"],
    aisle: "Baking",
    unitFamily: "volume"
  },

  // Dairy & Eggs
  {
    id: "unsalted-butter",
    name: "unsalted butter",
    aliases: ["butter", "sweet butter"],
    family: "butter",
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 0.96,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "salted-butter",
    name: "salted butter",
    aliases: [],
    family: "butter",
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 0.96,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "egg",
    name: "egg",
    aliases: ["eggs", "large egg", "large eggs"],
    aisle: "Dairy",
    unitFamily: "count"
  },
  {
    id: "whole-milk",
    name: "whole milk",
    aliases: ["milk", "cow milk"],
    family: "milk",
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 1.03,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "heavy-cream",
    name: "heavy cream",
    aliases: ["heavy whipping cream", "double cream"],
    family: "milk",
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 1.01,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "sour-cream",
    name: "sour cream",
    aliases: [],
    aisle: "Dairy",
    unitFamily: "volume"
  },
  {
    id: "cream-cheese",
    name: "cream cheese",
    aliases: [],
    aisle: "Dairy",
    unitFamily: "weight"
  },
  {
    id: "cheddar-cheese",
    name: "cheddar cheese",
    aliases: ["sharp cheddar cheese", "mild cheddar"],
    aisle: "Dairy",
    unitFamily: "weight"
  },
  {
    id: "parmesan-cheese",
    name: "parmesan cheese",
    aliases: ["parmigiano reggiano", "parmesan"],
    aisle: "Dairy",
    unitFamily: "weight"
  },

  // Oils & Vinegars
  {
    id: "olive-oil",
    name: "olive oil",
    aliases: ["extra virgin olive oil", "evoo"],
    family: "oil",
    aisle: "Oils & Vinegars",
    unitFamily: "volume",
    gramsPerMl: 0.92,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "vegetable-oil",
    name: "vegetable oil",
    aliases: ["canola oil", "cooking oil"],
    family: "oil",
    aisle: "Oils & Vinegars",
    unitFamily: "volume",
    gramsPerMl: 0.92,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "apple-cider-vinegar",
    name: "apple cider vinegar",
    aliases: ["acv", "cider vinegar"],
    family: "vinegar",
    aisle: "Oils & Vinegars",
    unitFamily: "volume"
  },
  {
    id: "white-vinegar",
    name: "white vinegar",
    aliases: ["distilled white vinegar"],
    family: "vinegar",
    aisle: "Oils & Vinegars",
    unitFamily: "volume"
  },

  // Seasonings & Spices
  {
    id: "salt",
    name: "salt",
    aliases: ["table salt", "fine sea salt"],
    family: "salt",
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 1.20,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "kosher-salt",
    name: "kosher salt",
    aliases: ["coarse salt"],
    family: "salt",
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.85,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "black-pepper",
    name: "black pepper",
    aliases: ["pepper", "ground black pepper", "freshly ground black pepper"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "garlic-powder",
    name: "garlic powder",
    aliases: [],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "onion-powder",
    name: "onion powder",
    aliases: [],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "ground-cumin",
    name: "ground cumin",
    aliases: ["cumin"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "ground-cinnamon",
    name: "ground cinnamon",
    aliases: ["cinnamon"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "paprika",
    name: "paprika",
    aliases: ["smoked paprika", "sweet paprika"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "chili-powder",
    name: "chili powder",
    aliases: [],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "dried-oregano",
    name: "dried oregano",
    aliases: ["oregano"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },

  // Produce
  {
    id: "garlic",
    name: "garlic",
    aliases: ["garlic clove", "garlic cloves"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "yellow-onion",
    name: "yellow onion",
    aliases: ["onion", "onions", "brown onion"],
    family: "onion",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "red-onion",
    name: "red onion",
    aliases: [],
    family: "onion",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "green-onion",
    name: "green onion",
    aliases: ["scallion", "scallions", "spring onion", "spring onions"],
    family: "onion",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "carrot",
    name: "carrot",
    aliases: ["carrots"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "celery",
    name: "celery",
    aliases: ["celery stalk", "celery stalks", "celery rib"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "russet-potato",
    name: "russet potato",
    aliases: ["potato", "potatoes", "baking potato", "idaho potato"],
    family: "potato",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "fresh-spinach",
    name: "fresh spinach",
    aliases: ["spinach", "baby spinach"],
    aisle: "Produce",
    unitFamily: "weight"
  },
  {
    id: "lemon",
    name: "lemon",
    aliases: ["lemons", "lemon juice"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "lime",
    name: "lime",
    aliases: ["limes", "lime juice"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "fresh-basil",
    name: "fresh basil",
    aliases: ["basil", "basil leaves"],
    aisle: "Produce",
    unitFamily: "volume"
  },

  // Meat & Seafood
  {
    id: "boneless-chicken-breast",
    name: "boneless chicken breast",
    aliases: ["chicken breast", "chicken breasts"],
    family: "chicken",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "boneless-chicken-thigh",
    name: "boneless chicken thigh",
    aliases: ["chicken thighs", "chicken thigh"],
    family: "chicken",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "ground-beef",
    name: "ground beef",
    aliases: ["minced beef", "hamburger meat"],
    family: "beef",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "bacon",
    name: "bacon",
    aliases: ["bacon strips", "thick cut bacon"],
    family: "pork",
    aisle: "Meat & Seafood",
    unitFamily: "count"
  },
  {
    id: "salmon-fillet",
    name: "salmon fillet",
    aliases: ["salmon", "salmon fillets"],
    family: "fish",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },

  // Canned Goods & Broths
  {
    id: "canned-diced-tomatoes",
    name: "canned diced tomatoes",
    aliases: ["diced tomatoes", "can diced tomatoes", "canned tomatoes"],
    aisle: "Canned Goods",
    unitFamily: "count"
  },
  {
    id: "tomato-paste",
    name: "tomato paste",
    aliases: [],
    aisle: "Canned Goods",
    unitFamily: "volume"
  },
  {
    id: "tomato-sauce",
    name: "tomato sauce",
    aliases: [],
    aisle: "Canned Goods",
    unitFamily: "volume"
  },
  {
    id: "black-beans",
    name: "canned black beans",
    aliases: ["black beans", "can black beans"],
    family: "beans",
    aisle: "Canned Goods",
    unitFamily: "count"
  },
  {
    id: "chickpeas",
    name: "canned chickpeas",
    aliases: ["chickpeas", "garbanzo beans", "can garbanzo beans"],
    family: "beans",
    aisle: "Canned Goods",
    unitFamily: "count"
  },
  {
    id: "chicken-broth",
    name: "chicken broth",
    aliases: ["chicken stock"],
    family: "broth",
    aisle: "Canned Goods",
    unitFamily: "volume",
    gramsPerMl: 1.0,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "beef-broth",
    name: "beef broth",
    aliases: ["beef stock"],
    family: "broth",
    aisle: "Canned Goods",
    unitFamily: "volume",
    gramsPerMl: 1.0,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "vegetable-broth",
    name: "vegetable broth",
    aliases: ["vegetable stock"],
    family: "broth",
    aisle: "Canned Goods",
    unitFamily: "volume",
    gramsPerMl: 1.0,
    densitySource: "USDA FoodData Central"
  },

  // Pantry & Dry Goods
  {
    id: "white-rice",
    name: "white rice",
    aliases: ["jasmine rice", "long grain white rice", "rice"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.85,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pasta",
    name: "pasta",
    aliases: ["spaghetti", "penne", "rigatoni", "elbow macaroni"],
    aisle: "Pantry",
    unitFamily: "weight"
  },
  {
    id: "soy-sauce",
    name: "soy sauce",
    aliases: ["shoyu"],
    aisle: "Pantry",
    unitFamily: "volume"
  },
  {
    id: "honey",
    name: "honey",
    aliases: ["raw honey"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 1.42,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "water",
    name: "water",
    aliases: ["tap water", "cold water", "warm water", "hot water", "ice water"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 1.0,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "blueberry",
    name: "blueberry",
    aliases: ["blueberries", "fresh blueberries", "frozen blueberries"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "strawberry",
    name: "strawberry",
    aliases: ["strawberries", "fresh strawberries"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  // Grains & Flours
  {
    id: "almond-flour",
    name: "almond flour",
    aliases: ["almond meal"],
    family: "flour",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.45,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "cornstarch",
    name: "cornstarch",
    aliases: ["corn starch", "maize starch"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.54,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "cornmeal",
    name: "cornmeal",
    aliases: ["yellow cornmeal", "polenta"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.61,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "rolled-oats",
    name: "rolled oats",
    aliases: ["old fashioned oats", "oatmeal", "oats"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.38,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "quick-oats",
    name: "quick oats",
    aliases: ["instant oats", "quick cooking oats"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.38,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "breadcrumbs",
    name: "breadcrumbs",
    aliases: ["bread crumbs", "dry breadcrumbs"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.45,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "panko",
    name: "panko",
    aliases: ["panko breadcrumbs", "japanese breadcrumbs"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.25,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "brown-rice",
    name: "brown rice",
    aliases: ["long grain brown rice", "brown jasmine rice"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.82,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "quinoa",
    name: "quinoa",
    aliases: ["white quinoa", "tricolor quinoa"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.72,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "couscous",
    name: "couscous",
    aliases: ["israeli couscous", "pearl couscous"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.73,
    densitySource: "USDA FoodData Central"
  },
  // Sweeteners & Syrups
  {
    id: "maple-syrup",
    name: "maple syrup",
    aliases: ["pure maple syrup"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 1.33,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "molasses",
    name: "molasses",
    aliases: ["blackstrap molasses", "dark molasses"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 1.41,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "agave-nectar",
    name: "agave nectar",
    aliases: ["agave syrup", "blue agave"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 1.37,
    densitySource: "USDA FoodData Central"
  },
  // Dairy & Refrigerated
  {
    id: "heavy-cream",
    name: "heavy cream",
    aliases: ["heavy whipping cream", "double cream"],
    family: "cream",
    aisle: "Dairy & Refrigerated",
    unitFamily: "volume",
    gramsPerMl: 1.01,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "sour-cream",
    name: "sour cream",
    aliases: ["cultured sour cream"],
    aisle: "Dairy & Refrigerated",
    unitFamily: "volume",
    gramsPerMl: 0.98,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "cream-cheese",
    name: "cream cheese",
    aliases: ["philadelphia cream cheese"],
    aisle: "Dairy & Refrigerated",
    unitFamily: "weight",
    gramsPerMl: 0.99,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "parmesan-cheese",
    name: "parmesan cheese",
    aliases: ["parmigiano", "parmigiano reggiano", "grated parmesan"],
    family: "cheese",
    aisle: "Dairy & Refrigerated",
    unitFamily: "volume"
  },
  {
    id: "cheddar-cheese",
    name: "cheddar cheese",
    aliases: ["sharp cheddar", "mild cheddar", "shredded cheddar"],
    family: "cheese",
    aisle: "Dairy & Refrigerated",
    unitFamily: "volume"
  },
  {
    id: "mozzarella-cheese",
    name: "mozzarella cheese",
    aliases: ["fresh mozzarella", "shredded mozzarella"],
    family: "cheese",
    aisle: "Dairy & Refrigerated",
    unitFamily: "volume"
  },
  {
    id: "ricotta-cheese",
    name: "ricotta cheese",
    aliases: ["whole milk ricotta"],
    family: "cheese",
    aisle: "Dairy & Refrigerated",
    unitFamily: "volume"
  },
  {
    id: "greek-yogurt",
    name: "greek yogurt",
    aliases: ["plain greek yogurt", "whole milk greek yogurt"],
    family: "yogurt",
    aisle: "Dairy & Refrigerated",
    unitFamily: "volume",
    gramsPerMl: 1.06,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "half-and-half",
    name: "half and half",
    aliases: ["half & half"],
    family: "cream",
    aisle: "Dairy & Refrigerated",
    unitFamily: "volume",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  // Produce - Vegetables
  {
    id: "red-onion",
    name: "red onion",
    aliases: ["purple onion"],
    family: "onion",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "shallot",
    name: "shallot",
    aliases: ["shallots", "french shallots"],
    family: "onion",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "scallion",
    name: "scallion",
    aliases: ["scallions", "green onion", "green onions", "spring onion"],
    family: "onion",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "leek",
    name: "leek",
    aliases: ["leeks"],
    family: "onion",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "celery",
    name: "celery",
    aliases: ["celery stalk", "celery rib"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "bell-pepper",
    name: "bell pepper",
    aliases: ["red bell pepper", "green bell pepper", "sweet pepper"],
    family: "pepper",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "jalapeno",
    name: "jalapeno pepper",
    aliases: ["jalapeno", "jalapenos"],
    family: "pepper",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "russet-potato",
    name: "russet potato",
    aliases: ["idaho potato", "baking potato"],
    family: "potato",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "sweet-potato",
    name: "sweet potato",
    aliases: ["yam", "sweet potatoes"],
    family: "potato",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "zucchini",
    name: "zucchini",
    aliases: ["courgette", "green squash"],
    family: "squash",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "broccoli",
    name: "broccoli",
    aliases: ["broccoli florets", "broccoli crowns"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "cauliflower",
    name: "cauliflower",
    aliases: ["cauliflower florets", "cauliflower head"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "spinach",
    name: "spinach",
    aliases: ["baby spinach", "fresh spinach"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "kale",
    name: "kale",
    aliases: ["lacinato kale", "curly kale"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "cabbage",
    name: "cabbage",
    aliases: ["green cabbage", "red cabbage", "savoy cabbage"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "cucumber",
    name: "cucumber",
    aliases: ["english cucumber", "persian cucumber"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "asparagus",
    name: "asparagus",
    aliases: ["asparagus spears"],
    aisle: "Produce",
    unitFamily: "weight"
  },
  {
    id: "mushroom",
    name: "button mushroom",
    aliases: ["mushrooms", "white mushrooms", "sliced mushrooms"],
    family: "mushroom",
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "cremini-mushroom",
    name: "cremini mushroom",
    aliases: ["baby bella", "brown mushrooms"],
    family: "mushroom",
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "portobello-mushroom",
    name: "portobello mushroom",
    aliases: ["portabella mushroom", "portobello caps"],
    family: "mushroom",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "green-beans",
    name: "green beans",
    aliases: ["string beans", "snap beans"],
    aisle: "Produce",
    unitFamily: "weight"
  },
  {
    id: "ginger-root",
    name: "fresh ginger",
    aliases: ["ginger", "ginger root", "minced ginger"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  // Produce - Fruits
  {
    id: "apple",
    name: "apple",
    aliases: ["apples", "granny smith apple", "honeycrisp apple"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "banana",
    name: "banana",
    aliases: ["bananas", "ripe bananas"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "lemon",
    name: "lemon",
    aliases: ["lemons", "lemon juice", "fresh lemon juice"],
    family: "citrus",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "lime",
    name: "lime",
    aliases: ["limes", "lime juice", "fresh lime juice"],
    family: "citrus",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "orange",
    name: "orange",
    aliases: ["oranges", "orange juice", "orange zest"],
    family: "citrus",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "avocado",
    name: "avocado",
    aliases: ["avocados", "haas avocado", "ripe avocado"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "raspberry",
    name: "raspberry",
    aliases: ["raspberries", "fresh raspberries"],
    family: "berry",
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "blackberry",
    name: "blackberry",
    aliases: ["blackberries", "fresh blackberries"],
    family: "berry",
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "peach",
    name: "peach",
    aliases: ["peaches", "yellow peach"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "pear",
    name: "pear",
    aliases: ["pears", "bosc pear"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "mango",
    name: "mango",
    aliases: ["mangoes", "fresh mango"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "pineapple",
    name: "pineapple",
    aliases: ["fresh pineapple", "pineapple chunks"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "cherry-tomato",
    name: "cherry tomato",
    aliases: ["cherry tomatoes", "grape tomatoes"],
    family: "tomato",
    aisle: "Produce",
    unitFamily: "volume"
  },
  // Herbs & Spices
  {
    id: "black-pepper",
    name: "black pepper",
    aliases: ["ground black pepper", "cracked black pepper"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "kosher-salt",
    name: "kosher salt",
    aliases: ["coarse salt"],
    family: "salt",
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.96,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "sea-salt",
    name: "sea salt",
    aliases: ["fine sea salt"],
    family: "salt",
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 1.15,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "dried-oregano",
    name: "dried oregano",
    aliases: ["oregano"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "fresh-basil",
    name: "fresh basil",
    aliases: ["basil", "basil leaves", "sweet basil"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "dried-thyme",
    name: "dried thyme",
    aliases: ["thyme", "ground thyme"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "fresh-rosemary",
    name: "fresh rosemary",
    aliases: ["rosemary", "rosemary sprig"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "fresh-parsley",
    name: "fresh parsley",
    aliases: ["parsley", "flat leaf parsley", "italian parsley"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "fresh-cilantro",
    name: "fresh cilantro",
    aliases: ["cilantro", "coriander leaves"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "fresh-dill",
    name: "fresh dill",
    aliases: ["dill", "dill weed"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "ground-cumin",
    name: "ground cumin",
    aliases: ["cumin", "cumin powder"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "paprika",
    name: "paprika",
    aliases: ["sweet paprika"],
    family: "paprika",
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "smoked-paprika",
    name: "smoked paprika",
    aliases: ["pimenton"],
    family: "paprika",
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "chili-powder",
    name: "chili powder",
    aliases: ["chilli powder"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "cayenne-pepper",
    name: "cayenne pepper",
    aliases: ["cayenne", "ground cayenne"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "ground-cinnamon",
    name: "ground cinnamon",
    aliases: ["cinnamon"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.56,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "ground-nutmeg",
    name: "ground nutmeg",
    aliases: ["nutmeg"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "ground-ginger",
    name: "ground ginger",
    aliases: ["ginger powder"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "ground-cloves",
    name: "ground cloves",
    aliases: ["cloves"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "bay-leaf",
    name: "bay leaf",
    aliases: ["bay leaves", "dried bay leaf"],
    aisle: "Spices & Seasonings",
    unitFamily: "count"
  },
  {
    id: "curry-powder",
    name: "curry powder",
    aliases: ["yellow curry powder"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "red-pepper-flakes",
    name: "red pepper flakes",
    aliases: ["crushed red pepper", "chili flakes"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  // Meat, Poultry & Seafood
  {
    id: "chicken-breast",
    name: "chicken breast",
    aliases: ["boneless skinless chicken breast", "chicken breasts"],
    family: "chicken",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "chicken-thigh",
    name: "chicken thigh",
    aliases: ["boneless chicken thighs", "chicken thighs"],
    family: "chicken",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "ground-chicken",
    name: "ground chicken",
    aliases: ["minced chicken"],
    family: "chicken",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "ground-turkey",
    name: "ground turkey",
    aliases: ["lean ground turkey"],
    family: "turkey",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "ground-pork",
    name: "ground pork",
    aliases: ["minced pork"],
    family: "pork",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "pork-chop",
    name: "pork chop",
    aliases: ["pork chops", "bone-in pork chop"],
    family: "pork",
    aisle: "Meat & Seafood",
    unitFamily: "count"
  },
  {
    id: "bacon",
    name: "bacon",
    aliases: ["thick cut bacon", "bacon strips", "slices bacon"],
    family: "pork",
    aisle: "Meat & Seafood",
    unitFamily: "count"
  },
  {
    id: "italian-sausage",
    name: "italian sausage",
    aliases: ["sweet italian sausage", "hot italian sausage"],
    family: "sausage",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "steak",
    name: "beef steak",
    aliases: ["ribeye steak", "sirloin steak", "strip steak"],
    family: "beef",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "chuck-roast",
    name: "chuck roast",
    aliases: ["beef chuck roast", "pot roast"],
    family: "beef",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "shrimp",
    name: "raw shrimp",
    aliases: ["shrimp", "large shrimp", "jumbo shrimp", "prawns"],
    family: "seafood",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "salmon-fillet",
    name: "salmon fillet",
    aliases: ["salmon", "fresh salmon", "salmon steaks"],
    family: "fish",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "canned-tuna",
    name: "canned tuna",
    aliases: ["tuna in water", "albacore tuna"],
    family: "fish",
    aisle: "Pantry",
    unitFamily: "count"
  },
  // Oils, Vinegars & Condiments
  {
    id: "canola-oil",
    name: "canola oil",
    aliases: ["vegetable oil"],
    family: "oil",
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.92,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "sesame-oil",
    name: "sesame oil",
    aliases: ["toasted sesame oil"],
    family: "oil",
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.92,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "coconut-oil",
    name: "coconut oil",
    aliases: ["virgin coconut oil"],
    family: "oil",
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.92,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "chicken-broth",
    name: "chicken broth",
    aliases: ["chicken stock"],
    family: "broth",
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 1.0,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "beef-broth",
    name: "beef broth",
    aliases: ["beef stock"],
    family: "broth",
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 1.0,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "vegetable-broth",
    name: "vegetable broth",
    aliases: ["vegetable stock"],
    family: "broth",
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 1.0,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "tomato-paste",
    name: "tomato paste",
    aliases: ["canned tomato paste"],
    family: "tomato",
    aisle: "Pantry",
    unitFamily: "volume"
  },
  {
    id: "black-beans",
    name: "black beans",
    aliases: ["canned black beans"],
    family: "beans",
    aisle: "Pantry",
    unitFamily: "volume"
  },
  {
    id: "kidney-beans",
    name: "kidney beans",
    aliases: ["canned kidney beans", "red kidney beans"],
    family: "beans",
    aisle: "Pantry",
    unitFamily: "volume"
  },
  {
    id: "garbanzo-beans",
    name: "chickpeas",
    aliases: ["garbanzo beans", "canned chickpeas"],
    family: "beans",
    aisle: "Pantry",
    unitFamily: "volume"
  },
  {
    id: "peanut-butter",
    name: "peanut butter",
    aliases: ["creamy peanut butter", "crunchy peanut butter"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 1.08,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "mayonnaise",
    name: "mayonnaise",
    aliases: ["mayo"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.94,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "dijon-mustard",
    name: "dijon mustard",
    aliases: ["mustard", "yellow mustard"],
    aisle: "Pantry",
    unitFamily: "volume"
  },
  {
    id: "apple-cider-vinegar",
    name: "apple cider vinegar",
    aliases: ["cider vinegar"],
    family: "vinegar",
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 1.01,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "red-wine-vinegar",
    name: "red wine vinegar",
    aliases: ["wine vinegar"],
    family: "vinegar",
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 1.01,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "balsamic-vinegar",
    name: "balsamic vinegar",
    aliases: ["aged balsamic vinegar"],
    family: "vinegar",
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 1.05,
    densitySource: "USDA FoodData Central"
  },
  // Nuts & Seeds
  {
    id: "walnuts",
    name: "walnuts",
    aliases: ["chopped walnuts", "walnut halves"],
    family: "nuts",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.5,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pecans",
    name: "pecans",
    aliases: ["chopped pecans", "pecan halves"],
    family: "nuts",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.46,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "almonds",
    name: "almonds",
    aliases: ["sliced almonds", "slivered almonds", "whole almonds"],
    family: "nuts",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.59,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pine-nuts",
    name: "pine nuts",
    aliases: ["pignoli"],
    family: "nuts",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.57,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "sesame-seeds",
    name: "sesame seeds",
    aliases: ["white sesame seeds", "toasted sesame seeds"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.61,
    densitySource: "USDA FoodData Central"
  }
];
