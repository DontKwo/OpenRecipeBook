import type { DictionaryIngredient } from "../domain/recipe/types";

export const BUILT_IN_INGREDIENTS: DictionaryIngredient[] = [
  {
    id: "all-purpose-flour",
    name: "all-purpose flour",
    aliases: ["flour","ap flour","white flour","plain flour"],
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
    aliases: ["sugar","white sugar","cane sugar"],
    family: "sugar",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.85,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "brown-sugar",
    name: "brown sugar",
    aliases: ["light brown sugar","dark brown sugar"],
    family: "sugar",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.83,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "powdered-sugar",
    name: "powdered sugar",
    aliases: ["confectioners sugar","icing sugar"],
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
    gramsPerMl: 0.9,
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
    aliases: ["dry yeast","instant yeast","rapid rise","rapid-rise yeast"],
    aisle: "Baking",
    unitFamily: "volume"
  },
  {
    id: "cocoa-powder",
    name: "cocoa powder",
    aliases: ["unsweetened cocoa powder","dutch process cocoa"],
    aisle: "Baking",
    unitFamily: "volume"
  },
  {
    id: "chocolate-chips",
    name: "chocolate chips",
    aliases: ["semi-sweet chocolate chips","dark chocolate chips"],
    aisle: "Baking",
    unitFamily: "volume"
  },
  {
    id: "vanilla-extract",
    name: "vanilla extract",
    aliases: ["pure vanilla extract","vanilla"],
    aisle: "Baking",
    unitFamily: "volume"
  },
  {
    id: "unsalted-butter",
    name: "unsalted butter",
    aliases: ["butter","sweet butter"],
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
    aliases: ["eggs","large egg","large eggs"],
    aisle: "Dairy",
    unitFamily: "count"
  },
  {
    id: "whole-milk",
    name: "whole milk",
    aliases: ["milk","cow milk"],
    family: "milk",
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 1.03,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "heavy-cream",
    name: "heavy cream",
    aliases: ["heavy whipping cream","double cream"],
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
    aliases: ["sharp cheddar cheese","mild cheddar"],
    aisle: "Dairy",
    unitFamily: "weight"
  },
  {
    id: "parmesan-cheese",
    name: "parmesan cheese",
    aliases: ["parmigiano reggiano","parmesan"],
    aisle: "Dairy",
    unitFamily: "weight"
  },
  {
    id: "olive-oil",
    name: "olive oil",
    aliases: ["extra virgin olive oil","evoo"],
    family: "oil",
    aisle: "Oils & Vinegars",
    unitFamily: "volume",
    gramsPerMl: 0.92,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "vegetable-oil",
    name: "vegetable oil",
    aliases: ["canola oil","cooking oil"],
    family: "oil",
    aisle: "Oils & Vinegars",
    unitFamily: "volume",
    gramsPerMl: 0.92,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "apple-cider-vinegar",
    name: "apple cider vinegar",
    aliases: ["acv","cider vinegar"],
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
  {
    id: "salt",
    name: "salt",
    aliases: ["table salt","fine sea salt"],
    family: "salt",
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 1.2,
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
    aliases: ["pepper","ground black pepper","freshly ground black pepper"],
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
    aliases: ["smoked paprika","sweet paprika"],
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
  {
    id: "garlic",
    name: "garlic",
    aliases: ["garlic clove","garlic cloves"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "yellow-onion",
    name: "yellow onion",
    aliases: ["onion","onions","brown onion"],
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
    aliases: ["scallion","scallions","spring onion","spring onions"],
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
    aliases: ["celery stalk","celery stalks","celery rib"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "russet-potato",
    name: "russet potato",
    aliases: ["potato","potatoes","baking potato","idaho potato"],
    family: "potato",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "fresh-spinach",
    name: "fresh spinach",
    aliases: ["spinach","baby spinach"],
    aisle: "Produce",
    unitFamily: "weight"
  },
  {
    id: "lemon",
    name: "lemon",
    aliases: ["lemons","lemon juice"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "lime",
    name: "lime",
    aliases: ["limes","lime juice"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "fresh-basil",
    name: "fresh basil",
    aliases: ["basil","basil leaves"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "boneless-chicken-breast",
    name: "boneless chicken breast",
    aliases: ["chicken breast","chicken breasts"],
    family: "chicken",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "boneless-chicken-thigh",
    name: "boneless chicken thigh",
    aliases: ["chicken thighs","chicken thigh"],
    family: "chicken",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "ground-beef",
    name: "ground beef",
    aliases: ["minced beef","hamburger meat"],
    family: "beef",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "bacon",
    name: "bacon",
    aliases: ["bacon strips","thick cut bacon"],
    family: "pork",
    aisle: "Meat & Seafood",
    unitFamily: "count"
  },
  {
    id: "salmon-fillet",
    name: "salmon fillet",
    aliases: ["salmon","salmon fillets"],
    family: "fish",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "canned-diced-tomatoes",
    name: "canned diced tomatoes",
    aliases: ["diced tomatoes","can diced tomatoes","canned tomatoes"],
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
    aliases: ["black beans","can black beans"],
    family: "beans",
    aisle: "Canned Goods",
    unitFamily: "count"
  },
  {
    id: "chickpeas",
    name: "canned chickpeas",
    aliases: ["chickpeas","garbanzo beans","can garbanzo beans"],
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
    gramsPerMl: 1,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "beef-broth",
    name: "beef broth",
    aliases: ["beef stock"],
    family: "broth",
    aisle: "Canned Goods",
    unitFamily: "volume",
    gramsPerMl: 1,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "vegetable-broth",
    name: "vegetable broth",
    aliases: ["vegetable stock"],
    family: "broth",
    aisle: "Canned Goods",
    unitFamily: "volume",
    gramsPerMl: 1,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "white-rice",
    name: "white rice",
    aliases: ["jasmine rice","long grain white rice","rice"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.85,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pasta",
    name: "pasta",
    aliases: ["spaghetti","penne","rigatoni","elbow macaroni"],
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
    aliases: ["tap water","cold water","warm water","hot water","ice water"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 1,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "blueberry",
    name: "blueberry",
    aliases: ["blueberries","fresh blueberries","frozen blueberries"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "strawberry",
    name: "strawberry",
    aliases: ["strawberries","fresh strawberries"],
    aisle: "Produce",
    unitFamily: "volume"
  },
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
    aliases: ["corn starch","maize starch"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.54,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "cornmeal",
    name: "cornmeal",
    aliases: ["yellow cornmeal","polenta"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.61,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "rolled-oats",
    name: "rolled oats",
    aliases: ["old fashioned oats","oatmeal","oats"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.38,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "quick-oats",
    name: "quick oats",
    aliases: ["instant oats","quick cooking oats"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.38,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "breadcrumbs",
    name: "breadcrumbs",
    aliases: ["bread crumbs","dry breadcrumbs"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.45,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "panko",
    name: "panko",
    aliases: ["panko breadcrumbs","japanese breadcrumbs"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.25,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "brown-rice",
    name: "brown rice",
    aliases: ["long grain brown rice","brown jasmine rice"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.82,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "quinoa",
    name: "quinoa",
    aliases: ["white quinoa","tricolor quinoa"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.72,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "couscous",
    name: "couscous",
    aliases: ["israeli couscous","pearl couscous"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 0.73,
    densitySource: "USDA FoodData Central"
  },
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
    aliases: ["blackstrap molasses","dark molasses"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 1.41,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "agave-nectar",
    name: "agave nectar",
    aliases: ["agave syrup","blue agave"],
    aisle: "Pantry",
    unitFamily: "volume",
    gramsPerMl: 1.37,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "mozzarella-cheese",
    name: "mozzarella cheese",
    aliases: ["fresh mozzarella","shredded mozzarella"],
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
    aliases: ["plain greek yogurt","whole milk greek yogurt"],
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
  {
    id: "shallot",
    name: "shallot",
    aliases: ["shallots","french shallots"],
    family: "onion",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "scallion",
    name: "scallion",
    aliases: ["scallions","green onion","green onions","spring onion"],
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
    id: "bell-pepper",
    name: "bell pepper",
    aliases: ["red bell pepper","green bell pepper","sweet pepper"],
    family: "pepper",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "jalapeno",
    name: "jalapeno pepper",
    aliases: ["jalapeno","jalapenos"],
    family: "pepper",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "sweet-potato",
    name: "sweet potato",
    aliases: ["yam","sweet potatoes"],
    family: "potato",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "zucchini",
    name: "zucchini",
    aliases: ["courgette","green squash"],
    family: "squash",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "broccoli",
    name: "broccoli",
    aliases: ["broccoli florets","broccoli crowns"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "cauliflower",
    name: "cauliflower",
    aliases: ["cauliflower florets","cauliflower head"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "spinach",
    name: "spinach",
    aliases: ["baby spinach","fresh spinach"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "kale",
    name: "kale",
    aliases: ["lacinato kale","curly kale"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "cabbage",
    name: "cabbage",
    aliases: ["green cabbage","red cabbage","savoy cabbage"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "cucumber",
    name: "cucumber",
    aliases: ["english cucumber","persian cucumber"],
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
    aliases: ["mushrooms","white mushrooms","sliced mushrooms"],
    family: "mushroom",
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "cremini-mushroom",
    name: "cremini mushroom",
    aliases: ["baby bella","brown mushrooms"],
    family: "mushroom",
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "portobello-mushroom",
    name: "portobello mushroom",
    aliases: ["portabella mushroom","portobello caps"],
    family: "mushroom",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "green-beans",
    name: "green beans",
    aliases: ["string beans","snap beans"],
    aisle: "Produce",
    unitFamily: "weight"
  },
  {
    id: "ginger-root",
    name: "fresh ginger",
    aliases: ["ginger","ginger root","minced ginger"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "apple",
    name: "apple",
    aliases: ["apples","granny smith apple","honeycrisp apple"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "banana",
    name: "banana",
    aliases: ["bananas","ripe bananas"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "orange",
    name: "orange",
    aliases: ["oranges","orange juice","orange zest"],
    family: "citrus",
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "avocado",
    name: "avocado",
    aliases: ["avocados","haas avocado","ripe avocado"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "raspberry",
    name: "raspberry",
    aliases: ["raspberries","fresh raspberries"],
    family: "berry",
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "blackberry",
    name: "blackberry",
    aliases: ["blackberries","fresh blackberries"],
    family: "berry",
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "peach",
    name: "peach",
    aliases: ["peaches","yellow peach"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "pear",
    name: "pear",
    aliases: ["pears","bosc pear"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "mango",
    name: "mango",
    aliases: ["mangoes","fresh mango"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "pineapple",
    name: "pineapple",
    aliases: ["fresh pineapple","pineapple chunks"],
    aisle: "Produce",
    unitFamily: "count"
  },
  {
    id: "cherry-tomato",
    name: "cherry tomato",
    aliases: ["cherry tomatoes","grape tomatoes"],
    family: "tomato",
    aisle: "Produce",
    unitFamily: "volume"
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
    id: "dried-thyme",
    name: "dried thyme",
    aliases: ["thyme","ground thyme"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "fresh-rosemary",
    name: "fresh rosemary",
    aliases: ["rosemary","rosemary sprig"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "fresh-parsley",
    name: "fresh parsley",
    aliases: ["parsley","flat leaf parsley","italian parsley"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "fresh-cilantro",
    name: "fresh cilantro",
    aliases: ["cilantro","coriander leaves"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "fresh-dill",
    name: "fresh dill",
    aliases: ["dill","dill weed"],
    aisle: "Produce",
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
    id: "cayenne-pepper",
    name: "cayenne pepper",
    aliases: ["cayenne","ground cayenne"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
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
    aliases: ["bay leaves","dried bay leaf"],
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
    aliases: ["crushed red pepper","chili flakes"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "chicken-breast",
    name: "chicken breast",
    aliases: ["boneless skinless chicken breast","chicken breasts"],
    family: "chicken",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "chicken-thigh",
    name: "chicken thigh",
    aliases: ["boneless chicken thighs","chicken thighs"],
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
    aliases: ["pork chops","bone-in pork chop"],
    family: "pork",
    aisle: "Meat & Seafood",
    unitFamily: "count"
  },
  {
    id: "italian-sausage",
    name: "italian sausage",
    aliases: ["sweet italian sausage","hot italian sausage"],
    family: "sausage",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "steak",
    name: "beef steak",
    aliases: ["ribeye steak","sirloin steak","strip steak"],
    family: "beef",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "chuck-roast",
    name: "chuck roast",
    aliases: ["beef chuck roast","pot roast"],
    family: "beef",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "shrimp",
    name: "raw shrimp",
    aliases: ["shrimp","large shrimp","jumbo shrimp","prawns"],
    family: "seafood",
    aisle: "Meat & Seafood",
    unitFamily: "weight"
  },
  {
    id: "canned-tuna",
    name: "canned tuna",
    aliases: ["tuna in water","albacore tuna"],
    family: "fish",
    aisle: "Pantry",
    unitFamily: "count"
  },
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
    id: "kidney-beans",
    name: "kidney beans",
    aliases: ["canned kidney beans","red kidney beans"],
    family: "beans",
    aisle: "Pantry",
    unitFamily: "volume"
  },
  {
    id: "garbanzo-beans",
    name: "chickpeas",
    aliases: ["garbanzo beans","canned chickpeas"],
    family: "beans",
    aisle: "Pantry",
    unitFamily: "volume"
  },
  {
    id: "peanut-butter",
    name: "peanut butter",
    aliases: ["creamy peanut butter","crunchy peanut butter"],
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
    aliases: ["mustard","yellow mustard"],
    aisle: "Pantry",
    unitFamily: "volume"
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
  {
    id: "walnuts",
    name: "walnuts",
    aliases: ["chopped walnuts","walnut halves"],
    family: "nuts",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.5,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pecans",
    name: "pecans",
    aliases: ["chopped pecans","pecan halves"],
    family: "nuts",
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.46,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "almonds",
    name: "almonds",
    aliases: ["sliced almonds","slivered almonds","whole almonds"],
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
    aliases: ["white sesame seeds","toasted sesame seeds"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.61,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "white-chocolate",
    name: "white chocolate",
    aliases: ["melted white chocolate","white chocolate chips"],
    aisle: "Baking",
    unitFamily: "volume"
  },
  {
    id: "marshmallows",
    name: "marshmallows",
    aliases: ["mini marshmallows","miniature marshmallows"],
    aisle: "Baking",
    unitFamily: "volume"
  },
  {
    id: "corn-kernels",
    name: "corn kernels",
    aliases: ["whole corn kernels","corn","sweet corn"],
    aisle: "Produce",
    unitFamily: "volume"
  },
  {
    id: "hominy",
    name: "hominy",
    aliases: ["white hominy","yellow hominy"],
    aisle: "Canned Goods",
    unitFamily: "volume"
  },
  {
    id: "tortilla-chips",
    name: "tortilla chips",
    aliases: ["crushed tortilla chips","corn chips"],
    aisle: "Snacks",
    unitFamily: "weight"
  },
  {
    id: "monterey-jack-cheese",
    name: "monterey jack cheese",
    aliases: ["shredded monterey jack cheese","monterey jack"],
    aisle: "Dairy",
    unitFamily: "weight"
  },
  {
    id: "fajita-seasoning",
    name: "fajita seasoning",
    aliases: ["taco seasoning"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "italian-seasoning",
    name: "italian seasoning",
    aliases: ["italian herb seasoning"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume"
  },
  {
    id: "cheese",
    name: "cheese",
    aliases: ["white american cheese","american cheese","shredded cheese"],
    aisle: "Dairy",
    unitFamily: "weight"
  },
  {
    id: "cornbread",
    name: "cornbread",
    aliases: ["cornbread mix"],
    aisle: "Bakery",
    unitFamily: "volume"
  },
  {
    id: "hot-sauce",
    name: "hot sauce",
    aliases: ["tabasco","sriracha","red hot"],
    aisle: "Condiments",
    unitFamily: "volume"
  },
  {
    id: "barbecue-sauce",
    name: "barbecue sauce",
    aliases: ["bbq sauce"],
    aisle: "Condiments",
    unitFamily: "volume"
  },
  {
    id: "green-chilies",
    name: "green chilies",
    aliases: ["green chiles","canned green chilies","canned green chiles"],
    aisle: "Canned Goods",
    unitFamily: "volume"
  },
  {
    id: "cooking-oil",
    name: "cooking oil",
    aliases: ["oil"],
    aisle: "Pantry",
    unitFamily: "volume"
  },
  {
    id: "turkey-breast",
    name: "turkey breast",
    aliases: ["turkey","boneless turkey breast"],
    aisle: "Meat",
    unitFamily: "weight"
  },
  {
    id: "pan-drippings",
    name: "pan drippings",
    aliases: ["drippings","turkey drippings"],
    aisle: "Meat",
    unitFamily: "volume"
  },
  {
    id: "sausage",
    name: "sausage",
    aliases: ["hot sausage","sage sausage","pork sausage","bulk sausage"],
    aisle: "Meat",
    unitFamily: "weight"
  },
  {
    id: "bisquick",
    name: "bisquick",
    aliases: ["baking mix","pancake mix"],
    aisle: "Baking",
    unitFamily: "volume"
  },
  {
    id: "worcestershire-sauce",
    name: "worcestershire sauce",
    aliases: ["worcestershire"],
    aisle: "Condiments",
    unitFamily: "volume"
  },
  {
    id: "instant-coffee-powder",
    name: "instant coffee powder",
    aliases: ["instant coffee","espresso powder"],
    aisle: "Coffee & Tea",
    unitFamily: "volume"
  },
  {
    id: "thai-tea-mix",
    name: "thai tea mix",
    aliases: ["thai tea"],
    aisle: "Coffee & Tea",
    unitFamily: "volume"
  },
  {
    id: "brussels-sprouts",
    name: "Brussels sprouts",
    aliases: ["brussel sprouts"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.6,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "eggplant",
    name: "eggplant",
    aliases: ["aubergine"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.55,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "arugula",
    name: "arugula",
    aliases: ["rocket","baby arugula"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.2,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "butternut-squash",
    name: "butternut squash",
    aliases: ["winter squash"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.68,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "leeks",
    name: "leeks",
    aliases: ["leek"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.52,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "fennel",
    name: "fennel bulb",
    aliases: ["fennel","anise bulb"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.55,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "radishes",
    name: "radishes",
    aliases: ["red radishes","radish"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.62,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "russet-potatoes",
    name: "russet potatoes",
    aliases: ["baking potatoes","idaho potatoes"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.75,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "yukon-gold-potatoes",
    name: "Yukon gold potatoes",
    aliases: ["yellow potatoes"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.76,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "red-potatoes",
    name: "red potatoes",
    aliases: ["new potatoes","baby red potatoes"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.75,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "red-bell-pepper",
    name: "red bell pepper",
    aliases: ["sweet red pepper"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.62,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "yellow-bell-pepper",
    name: "yellow bell pepper",
    aliases: ["sweet yellow pepper"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.62,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "jalapeno-pepper",
    name: "jalapeño pepper",
    aliases: ["jalapeno","jalapenos"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.65,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "serrano-pepper",
    name: "serrano pepper",
    aliases: ["serrano chile"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.65,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "poblano-pepper",
    name: "poblano pepper",
    aliases: ["poblano chile","ancho chile fresh"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.6,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "fresh-ginger",
    name: "fresh ginger",
    aliases: ["ginger root","minced ginger"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.8,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "cremini-mushrooms",
    name: "cremini mushrooms",
    aliases: ["baby bella mushrooms","brown mushrooms"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.35,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "shiitake-mushrooms",
    name: "shiitake mushrooms",
    aliases: ["fresh shiitake"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.32,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "portobello-mushrooms",
    name: "portobello mushrooms",
    aliases: ["portabella mushrooms"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.35,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "cherry-tomatoes",
    name: "cherry tomatoes",
    aliases: ["grape tomatoes"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.64,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "roma-tomatoes",
    name: "Roma tomatoes",
    aliases: ["plum tomatoes","paste tomatoes"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.68,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "snow-peas",
    name: "snow peas",
    aliases: ["sugar snap peas","snap peas"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.5,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "red-cabbage",
    name: "red cabbage",
    aliases: ["purple cabbage"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.45,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "bok-choy",
    name: "bok choy",
    aliases: ["pak choi","baby bok choy"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.4,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "shallots",
    name: "shallots",
    aliases: ["shallot","minced shallot"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.68,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "apples",
    name: "apples",
    aliases: ["honeycrisp apple","granny smith apple","gala apple"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.65,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "bananas",
    name: "bananas",
    aliases: ["banana","ripe bananas"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.75,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "blueberries",
    name: "blueberries",
    aliases: ["fresh blueberries"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.62,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "strawberries",
    name: "strawberries",
    aliases: ["fresh strawberries","sliced strawberries"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.6,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "raspberries",
    name: "raspberries",
    aliases: ["fresh raspberries"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.55,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "blackberries",
    name: "blackberries",
    aliases: ["fresh blackberries"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.58,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "peaches",
    name: "peaches",
    aliases: ["fresh peaches","sliced peaches"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.65,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "oranges",
    name: "navel oranges",
    aliases: ["orange","oranges"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.7,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "limes",
    name: "limes",
    aliases: ["lime","fresh lime"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.72,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "lemons",
    name: "lemons",
    aliases: ["lemon","fresh lemon"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.72,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "fresh-thyme",
    name: "fresh thyme",
    aliases: ["thyme sprigs","thyme leaves"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.35,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "fresh-mint",
    name: "fresh mint",
    aliases: ["mint leaves","spearmint"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.25,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "fresh-sage",
    name: "fresh sage",
    aliases: ["sage leaves","minced sage"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.28,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "fresh-chives",
    name: "fresh chives",
    aliases: ["minced chives","chopped chives"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.3,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "fresh-tarragon",
    name: "fresh tarragon",
    aliases: ["french tarragon"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.25,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "skim-milk",
    name: "skim milk",
    aliases: ["nonfat milk","fat free milk"],
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 1.03,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "almond-milk",
    name: "unsweetened almond milk",
    aliases: ["almond milk"],
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 1.01,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "oat-milk",
    name: "oat milk",
    aliases: ["unsweetened oat milk"],
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "soy-milk",
    name: "soy milk",
    aliases: ["unsweetened soy milk"],
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "evaporated-milk",
    name: "evaporated milk",
    aliases: ["canned evaporated milk"],
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 1.07,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "sweetened-condensed-milk",
    name: "sweetened condensed milk",
    aliases: ["condensed milk"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 1.3,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "ghee",
    name: "ghee",
    aliases: ["clarified butter"],
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 0.91,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "cottage-cheese",
    name: "cottage cheese",
    aliases: ["small curd cottage cheese"],
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 0.95,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "mascarpone",
    name: "mascarpone cheese",
    aliases: ["mascarpone"],
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 0.98,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "provolone-cheese",
    name: "provolone cheese",
    aliases: ["sliced provolone"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.55,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "swiss-cheese",
    name: "swiss cheese",
    aliases: ["sliced swiss","emmental"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.55,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "gruyere-cheese",
    name: "Gruyère cheese",
    aliases: ["gruyere","shredded gruyere"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.56,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "feta-cheese",
    name: "feta cheese",
    aliases: ["crumbled feta"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.63,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "goat-cheese",
    name: "goat cheese",
    aliases: ["chèvre","chevre log"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.65,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "blue-cheese",
    name: "blue cheese",
    aliases: ["bleu cheese","gorgonzola"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.62,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "brie-cheese",
    name: "Brie cheese",
    aliases: ["brie round"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.65,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pepper-jack-cheese",
    name: "Pepper Jack cheese",
    aliases: ["pepper jack"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.55,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "gouda-cheese",
    name: "Gouda cheese",
    aliases: ["smoked gouda","gouda"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.58,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pecorino-romano",
    name: "Pecorino Romano",
    aliases: ["pecorino","grated pecorino"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.48,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "chicken-thighs-boneless",
    name: "boneless skinless chicken thighs",
    aliases: ["chicken thighs","boneless chicken thighs"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.04,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "whole-chicken",
    name: "whole roasting chicken",
    aliases: ["whole chicken"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.05,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "ribeye-steak",
    name: "ribeye steak",
    aliases: ["beef ribeye","bone-in ribeye"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.05,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "sirloin-steak",
    name: "top sirloin steak",
    aliases: ["sirloin","beef sirloin"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.05,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "beef-chuck-roast",
    name: "beef chuck roast",
    aliases: ["pot roast","chuck roast"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.05,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "beef-brisket",
    name: "beef brisket",
    aliases: ["whole packer brisket","flat brisket"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.05,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "flank-steak",
    name: "flank steak",
    aliases: ["beef flank steak"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.05,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "beef-short-ribs",
    name: "beef short ribs",
    aliases: ["bone-in short ribs","braising ribs"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.05,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pork-chops",
    name: "bone-in pork chops",
    aliases: ["pork chops","center cut pork chops"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.04,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pork-tenderloin",
    name: "pork tenderloin",
    aliases: ["whole pork tenderloin"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.04,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pork-shoulder",
    name: "pork shoulder roast",
    aliases: ["boston butt","pork butt","pork shoulder"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.04,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "italian-sausage-sweet",
    name: "sweet Italian sausage",
    aliases: ["italian sausage","mild italian sausage"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "chorizo",
    name: "Mexican chorizo",
    aliases: ["chorizo sausage","bulk chorizo"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pancetta",
    name: "diced pancetta",
    aliases: ["pancetta"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "prosciutto",
    name: "prosciutto di Parma",
    aliases: ["prosciutto","sliced prosciutto"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "cod-fillet",
    name: "Pacific cod fillet",
    aliases: ["cod","cod fillets"],
    aisle: "Seafood",
    unitFamily: "weight",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "halibut",
    name: "halibut fillet",
    aliases: ["fresh halibut"],
    aisle: "Seafood",
    unitFamily: "weight",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "raw-shrimp",
    name: "raw peeled shrimp",
    aliases: ["shrimp","large shrimp","jumbo shrimp"],
    aisle: "Seafood",
    unitFamily: "weight",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "sea-scallops",
    name: "sea scallops",
    aliases: ["jumbo sea scallops","scallops"],
    aisle: "Seafood",
    unitFamily: "weight",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "jasmine-rice",
    name: "jasmine rice",
    aliases: ["thai jasmine rice"],
    aisle: "Grains & Pasta",
    unitFamily: "volume",
    gramsPerMl: 0.82,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "basmati-rice",
    name: "basmati rice",
    aliases: ["indian basmati rice"],
    aisle: "Grains & Pasta",
    unitFamily: "volume",
    gramsPerMl: 0.81,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "arborio-rice",
    name: "Arborio risotto rice",
    aliases: ["arborio rice","risotto rice"],
    aisle: "Grains & Pasta",
    unitFamily: "volume",
    gramsPerMl: 0.85,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "spaghetti",
    name: "spaghetti pasta",
    aliases: ["spaghetti"],
    aisle: "Grains & Pasta",
    unitFamily: "weight",
    gramsPerMl: 0.65,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "fettuccine",
    name: "fettuccine pasta",
    aliases: ["fettuccine"],
    aisle: "Grains & Pasta",
    unitFamily: "weight",
    gramsPerMl: 0.65,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "penne-pasta",
    name: "penne rigate",
    aliases: ["penne","penne pasta"],
    aisle: "Grains & Pasta",
    unitFamily: "weight",
    gramsPerMl: 0.48,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "elbow-macaroni",
    name: "elbow macaroni",
    aliases: ["macaroni"],
    aisle: "Grains & Pasta",
    unitFamily: "weight",
    gramsPerMl: 0.52,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "lasagna-noodles",
    name: "lasagna noodles",
    aliases: ["lasagna sheets"],
    aisle: "Grains & Pasta",
    unitFamily: "weight",
    gramsPerMl: 0.65,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "orzo",
    name: "orzo pasta",
    aliases: ["orzo"],
    aisle: "Grains & Pasta",
    unitFamily: "volume",
    gramsPerMl: 0.83,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "cannellini-beans",
    name: "canned cannellini beans",
    aliases: ["white kidney beans","cannellini"],
    aisle: "Canned Goods",
    unitFamily: "volume",
    gramsPerMl: 0.87,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "brown-lentils",
    name: "brown lentils",
    aliases: ["dried lentils","lentils"],
    aisle: "Grains & Pasta",
    unitFamily: "volume",
    gramsPerMl: 0.82,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "coconut-flour",
    name: "organic coconut flour",
    aliases: ["coconut flour"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.54,
    densitySource: "King Arthur Baking Weight Chart"
  },
  {
    id: "gluten-free-flour-blend",
    name: "1:1 gluten-free baking flour",
    aliases: ["gluten free flour","measure for measure flour"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.63,
    densitySource: "King Arthur Baking Weight Chart"
  },
  {
    id: "arrowroot-powder",
    name: "arrowroot starch powder",
    aliases: ["arrowroot","arrowroot starch"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.54,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "instant-yeast",
    name: "instant yeast",
    aliases: ["rapid rise yeast","bread machine yeast"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.64,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "cream-of-tartar",
    name: "cream of tartar",
    aliases: ["potassium bitartrate"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.62,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pure-maple-syrup",
    name: "100% pure maple syrup",
    aliases: ["maple syrup"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 1.32,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "dutch-process-cocoa",
    name: "Dutch-process cocoa powder",
    aliases: ["cocoa powder","dutch cocoa"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.42,
    densitySource: "King Arthur Baking Weight Chart"
  },
  {
    id: "semi-sweet-chocolate-chips",
    name: "semi-sweet chocolate chips",
    aliases: ["chocolate chips","semisweet chips"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.72,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "extra-virgin-olive-oil",
    name: "extra virgin olive oil",
    aliases: ["evoo","olive oil"],
    aisle: "Oils & Vinegars",
    unitFamily: "volume",
    gramsPerMl: 0.92,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "avocado-oil",
    name: "pure avocado oil",
    aliases: ["avocado oil"],
    aisle: "Oils & Vinegars",
    unitFamily: "volume",
    gramsPerMl: 0.91,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "toasted-sesame-oil",
    name: "toasted sesame oil",
    aliases: ["sesame oil","dark sesame oil"],
    aisle: "Oils & Vinegars",
    unitFamily: "volume",
    gramsPerMl: 0.92,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "white-wine-vinegar",
    name: "white wine vinegar",
    aliases: ["white vinegar wine"],
    aisle: "Oils & Vinegars",
    unitFamily: "volume",
    gramsPerMl: 1.01,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "rice-vinegar",
    name: "unseasoned rice vinegar",
    aliases: ["rice vinegar","rice wine vinegar"],
    aisle: "Oils & Vinegars",
    unitFamily: "volume",
    gramsPerMl: 1.01,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "tamari",
    name: "gluten-free tamari soy sauce",
    aliases: ["tamari","tamari sauce"],
    aisle: "Condiments",
    unitFamily: "volume",
    gramsPerMl: 1.15,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "coconut-aminos",
    name: "organic coconut aminos",
    aliases: ["coconut aminos"],
    aisle: "Condiments",
    unitFamily: "volume",
    gramsPerMl: 1.18,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "fish-sauce",
    name: "premium fish sauce",
    aliases: ["fish sauce"],
    aisle: "Condiments",
    unitFamily: "volume",
    gramsPerMl: 1.22,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "hoisin-sauce",
    name: "hoisin sauce",
    aliases: ["hoisin"],
    aisle: "Condiments",
    unitFamily: "volume",
    gramsPerMl: 1.25,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "sriracha-sauce",
    name: "sriracha hot chili sauce",
    aliases: ["sriracha"],
    aisle: "Condiments",
    unitFamily: "volume",
    gramsPerMl: 1.12,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "tahini",
    name: "pure roasted sesame tahini",
    aliases: ["tahini paste","sesame paste"],
    aisle: "Condiments",
    unitFamily: "volume",
    gramsPerMl: 1.03,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "san-marzano-tomatoes",
    name: "whole peeled San Marzano tomatoes",
    aliases: ["canned whole tomatoes","san marzano"],
    aisle: "Canned Goods",
    unitFamily: "volume",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "diced-tomatoes",
    name: "canned petite diced tomatoes",
    aliases: ["diced tomatoes","canned tomatoes"],
    aisle: "Canned Goods",
    unitFamily: "volume",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "sea-salt-fine",
    name: "fine sea salt",
    aliases: ["sea salt","fine salt"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 1.15,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "black-peppercorns",
    name: "freshly ground black pepper",
    aliases: ["black pepper","ground black pepper"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.58,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "crushed-red-pepper",
    name: "crushed red pepper flakes",
    aliases: ["red pepper flakes","chili flakes"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.38,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "dried-bay-leaves",
    name: "dried Turkish bay leaves",
    aliases: ["bay leaves","bay leaf"],
    aisle: "Spices & Seasonings",
    unitFamily: "count",
    gramsPerMl: 0.2,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "garam-masala",
    name: "aromatic garam masala blend",
    aliases: ["garam masala"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.45,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "sliced-almonds",
    name: "sliced blanched almonds",
    aliases: ["sliced almonds","slivered almonds"],
    aisle: "Nuts & Seeds",
    unitFamily: "volume",
    gramsPerMl: 0.44,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "chia-seeds",
    name: "black chia seeds",
    aliases: ["chia seeds"],
    aisle: "Nuts & Seeds",
    unitFamily: "volume",
    gramsPerMl: 0.72,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "ground-flaxseed",
    name: "ground golden flaxseed meal",
    aliases: ["flaxseed meal","ground flax"],
    aisle: "Nuts & Seeds",
    unitFamily: "volume",
    gramsPerMl: 0.54,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pepitas",
    name: "raw pumpkin seeds",
    aliases: ["pepitas","pumpkin seeds"],
    aisle: "Nuts & Seeds",
    unitFamily: "volume",
    gramsPerMl: 0.55,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "raisins",
    name: "seedless Thompson raisins",
    aliases: ["raisins","dark raisins"],
    aisle: "Snacks",
    unitFamily: "volume",
    gramsPerMl: 0.68,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "dried-cranberries",
    name: "sweetened dried cranberries",
    aliases: ["dried cranberries","craisins"],
    aisle: "Snacks",
    unitFamily: "volume",
    gramsPerMl: 0.58,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "swiss-chard",
    name: "Swiss chard",
    aliases: ["rainbow chard","chard"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.28,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "collard-greens",
    name: "collard greens",
    aliases: ["collards"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.3,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "watercress",
    name: "fresh watercress",
    aliases: ["watercress"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.2,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "parsnips",
    name: "parsnips",
    aliases: ["parsnip"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.65,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "turnips",
    name: "purple top turnips",
    aliases: ["turnip","white turnip"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.62,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "rutabaga",
    name: "rutabaga",
    aliases: ["swede","yellow turnip"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.65,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "jicama",
    name: "fresh jicama",
    aliases: ["jicama root","mexican turnip"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.68,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "plantains",
    name: "green plantains",
    aliases: ["plantain","maduros"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.78,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "fresh-figs",
    name: "fresh black mission figs",
    aliases: ["fresh figs","figs"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.72,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "medjool-dates",
    name: "Medjool dates",
    aliases: ["pitted dates","dates"],
    aisle: "Produce",
    unitFamily: "weight",
    gramsPerMl: 0.85,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "kiwi",
    name: "kiwi fruit",
    aliases: ["kiwifruit","kiwis"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.72,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "pomegranate-arils",
    name: "fresh pomegranate arils",
    aliases: ["pomegranate seeds","pomegranate"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.75,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "papaya",
    name: "fresh red papaya",
    aliases: ["papaya","diced papaya"],
    aisle: "Produce",
    unitFamily: "count",
    gramsPerMl: 0.68,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "semolina-flour",
    name: "durum semolina flour",
    aliases: ["semolina","pasta flour"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.7,
    densitySource: "King Arthur Baking Weight Chart"
  },
  {
    id: "rye-flour",
    name: "medium organic rye flour",
    aliases: ["rye flour"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.47,
    densitySource: "King Arthur Baking Weight Chart"
  },
  {
    id: "spelt-flour",
    name: "whole grain spelt flour",
    aliases: ["spelt flour"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.5,
    densitySource: "King Arthur Baking Weight Chart"
  },
  {
    id: "masa-harina",
    name: "corn masa harina",
    aliases: ["maseca","tortilla flour"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.52,
    densitySource: "King Arthur Baking Weight Chart"
  },
  {
    id: "yellow-cornmeal",
    name: "medium ground yellow cornmeal",
    aliases: ["cornmeal","polenta meal"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.65,
    densitySource: "King Arthur Baking Weight Chart"
  },
  {
    id: "pearl-barley",
    name: "pearled barley",
    aliases: ["pearl barley","barley"],
    aisle: "Grains & Pasta",
    unitFamily: "volume",
    gramsPerMl: 0.85,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "farro",
    name: "pearled farro",
    aliases: ["farro","emmer wheat"],
    aisle: "Grains & Pasta",
    unitFamily: "volume",
    gramsPerMl: 0.82,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "bulgur-wheat",
    name: "fine bulgur wheat",
    aliases: ["bulgur","cracked wheat"],
    aisle: "Grains & Pasta",
    unitFamily: "volume",
    gramsPerMl: 0.74,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "buckwheat-groats",
    name: "roasted buckwheat groats",
    aliases: ["kasha","buckwheat"],
    aisle: "Grains & Pasta",
    unitFamily: "volume",
    gramsPerMl: 0.75,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "manchego-cheese",
    name: "aged Manchego cheese",
    aliases: ["manchego","spanish sheep cheese"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.58,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "fontina-cheese",
    name: "Italian Fontina cheese",
    aliases: ["fontina"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.56,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "taleggio-cheese",
    name: "Taleggio cheese",
    aliases: ["taleggio"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.6,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "queso-fresco",
    name: "crumbled queso fresco",
    aliases: ["queso fresco","mexican crumbling cheese"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.62,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "cotija-cheese",
    name: "aged Cotija cheese",
    aliases: ["cotija","queso cotija"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.55,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "halloumi-cheese",
    name: "grilling Halloumi cheese",
    aliases: ["halloumi"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.62,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "paneer-cheese",
    name: "fresh Indian paneer",
    aliases: ["paneer"],
    aisle: "Dairy",
    unitFamily: "weight",
    gramsPerMl: 0.65,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "labneh",
    name: "strained yogurt labneh",
    aliases: ["labneh","kefir cheese"],
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 0.98,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "lamb-chops",
    name: "loin lamb chops",
    aliases: ["lamb chops","rack of lamb"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.05,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "ground-lamb",
    name: "ground lamb",
    aliases: ["minced lamb"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.03,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "andouille-sausage",
    name: "smoked Andouille sausage",
    aliases: ["andouille","cajun sausage"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "kielbasa",
    name: "smoked Polish kielbasa",
    aliases: ["kielbasa","polish sausage"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "duck-breast",
    name: "Moulard duck breast",
    aliases: ["duck breast","magret de canard"],
    aisle: "Meat",
    unitFamily: "weight",
    gramsPerMl: 1.04,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "trout-fillet",
    name: "rainbow trout fillet",
    aliases: ["trout","steelhead trout"],
    aisle: "Seafood",
    unitFamily: "weight",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "mahi-mahi",
    name: "wild mahi mahi fillet",
    aliases: ["mahi mahi","dorado"],
    aisle: "Seafood",
    unitFamily: "weight",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "calamari",
    name: "cleaned squid tubes and tentacles",
    aliases: ["calamari","squid"],
    aisle: "Seafood",
    unitFamily: "weight",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "anchovies-oil",
    name: "anchovy fillets packed in olive oil",
    aliases: ["canned anchovies","anchovy fillets","anchovies"],
    aisle: "Canned Goods",
    unitFamily: "weight",
    gramsPerMl: 1.05,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "sardines-oil",
    name: "wild sardines packed in olive oil",
    aliases: ["canned sardines","sardines"],
    aisle: "Canned Goods",
    unitFamily: "weight",
    gramsPerMl: 1.05,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "white-miso-paste",
    name: "sweet white shiro miso paste",
    aliases: ["white miso","miso paste"],
    aisle: "International",
    unitFamily: "volume",
    gramsPerMl: 1.25,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "red-miso-paste",
    name: "aged red aka miso paste",
    aliases: ["red miso"],
    aisle: "International",
    unitFamily: "volume",
    gramsPerMl: 1.28,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "gochujang",
    name: "Korean fermented chili paste gochujang",
    aliases: ["gochujang","korean chili paste"],
    aisle: "International",
    unitFamily: "volume",
    gramsPerMl: 1.3,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "gochugaru",
    name: "Korean sun-dried coarse chili flakes gochugaru",
    aliases: ["gochugaru","korean red pepper flakes"],
    aisle: "International",
    unitFamily: "volume",
    gramsPerMl: 0.45,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "mirin",
    name: "Japanese sweet cooking rice wine mirin",
    aliases: ["mirin","hon-mirin"],
    aisle: "International",
    unitFamily: "volume",
    gramsPerMl: 1.15,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "shaoxing-wine",
    name: "Shaoxing Chinese cooking wine",
    aliases: ["shaoxing wine","chinese rice wine"],
    aisle: "International",
    unitFamily: "volume",
    gramsPerMl: 1.02,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "oyster-sauce",
    name: "premium oyster sauce",
    aliases: ["oyster sauce"],
    aisle: "Condiments",
    unitFamily: "volume",
    gramsPerMl: 1.28,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "kimchi",
    name: "traditional napa cabbage kimchi",
    aliases: ["kimchi","cabbage kimchi"],
    aisle: "Produce",
    unitFamily: "volume",
    gramsPerMl: 0.95,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "kalamata-olives",
    name: "pitted Kalamata olives in brine",
    aliases: ["kalamata olives","greek olives"],
    aisle: "Canned Goods",
    unitFamily: "volume",
    gramsPerMl: 0.68,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "castelvetrano-olives",
    name: "pitted Castelvetrano green olives",
    aliases: ["castelvetrano olives","green olives"],
    aisle: "Canned Goods",
    unitFamily: "volume",
    gramsPerMl: 0.68,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "capers-brine",
    name: "non-pareil capers in brine",
    aliases: ["capers","pickled capers"],
    aisle: "Condiments",
    unitFamily: "volume",
    gramsPerMl: 0.72,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "artichoke-hearts",
    name: "canned quartered artichoke hearts in water",
    aliases: ["artichoke hearts","canned artichokes"],
    aisle: "Canned Goods",
    unitFamily: "volume",
    gramsPerMl: 0.78,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "roasted-red-peppers",
    name: "roasted red bell peppers in water",
    aliases: ["roasted red peppers","jarred peppers"],
    aisle: "Canned Goods",
    unitFamily: "volume",
    gramsPerMl: 0.85,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "coconut-milk-canned",
    name: "full-fat unsweetened coconut milk",
    aliases: ["canned coconut milk","coconut milk"],
    aisle: "Canned Goods",
    unitFamily: "volume",
    gramsPerMl: 0.98,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "ground-cardamom",
    name: "ground green cardamom",
    aliases: ["cardamom","cardamom powder"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.44,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "whole-star-anise",
    name: "whole star anise pods",
    aliases: ["star anise"],
    aisle: "Spices & Seasonings",
    unitFamily: "count",
    gramsPerMl: 0.35,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "fennel-seeds",
    name: "whole sweet fennel seeds",
    aliases: ["fennel seeds"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.45,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "coriander-ground",
    name: "ground coriander seeds",
    aliases: ["ground coriander","coriander powder"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.42,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "ground-turmeric",
    name: "ground turmeric root",
    aliases: ["turmeric","turmeric powder"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.55,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "ground-allspice",
    name: "ground Jamaican allspice",
    aliases: ["allspice","pimento ground"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.52,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "sumac",
    name: "wild ground sumac berry powder",
    aliases: ["sumac","sumac spice"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.5,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "saffron-threads",
    name: "pure Spanish saffron threads",
    aliases: ["saffron","saffron stigmas"],
    aisle: "Spices & Seasonings",
    unitFamily: "weight",
    gramsPerMl: 0.25,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "white-peppercorns-ground",
    name: "finely ground white pepper",
    aliases: ["white pepper","ground white pepper"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.6,
    densitySource: "USDA FoodData Central"
  },
  {
    id: "mustard-seeds-yellow",
    name: "whole yellow mustard seeds",
    aliases: ["mustard seeds","yellow mustard seeds"],
    aisle: "Spices & Seasonings",
    unitFamily: "volume",
    gramsPerMl: 0.72,
    densitySource: "USDA FoodData Central"
  }
];
