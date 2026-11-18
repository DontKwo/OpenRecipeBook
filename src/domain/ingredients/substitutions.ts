import type { IngredientSubstitution } from "../recipe/types";

export interface SubstitutionRule {
  targetKeywords: string[];
  substitutes: {
    name: string;
    ratio: number;
    amountNote?: string;
    baseGrade: "A+" | "A" | "B+" | "B" | "C" | "D";
    why: string;
    when: string;
    how: string;
    dietaryTags?: string[];
    bakingGrade?: "A+" | "A" | "B+" | "B" | "C" | "D";
    savoryGrade?: "A+" | "A" | "B+" | "B" | "C" | "D";
  }[];
}

export const CULINARY_SUBSTITUTIONS_DATABASE: SubstitutionRule[] = [
  {
    targetKeywords: ["buttermilk"],
    substitutes: [
      {
        name: "Milk + Lemon Juice or Vinegar",
        ratio: 1.0,
        baseGrade: "A+",
        why: "Curdles milk proteins to mimic authentic lactic acidity and activate baking soda.",
        when: "Pancakes, biscuits, marinades, and baked batters.",
        how: "Add 1 tablespoon lemon juice or white vinegar to a liquid measuring cup, fill with milk to 1 cup mark, and let rest 5 minutes.",
        dietaryTags: ["vegetarian"]
      },
      {
        name: "Plain Greek Yogurt (Thinned)",
        ratio: 1.0,
        baseGrade: "A",
        why: "Contains active lactic cultures and rich tangy flavor profile.",
        when: "Marinades, salad dressings, and quick breads.",
        how: "Whisk 3/4 cup plain Greek yogurt with 1/4 cup whole milk or water until smooth.",
        dietaryTags: ["vegetarian"]
      }
    ]
  },
  {
    targetKeywords: ["heavy cream", "whipping cream", "heavy whipping cream"],
    substitutes: [
      {
        name: "Whole Milk + Melted Unsalted Butter",
        ratio: 1.0,
        baseGrade: "A",
        bakingGrade: "A",
        savoryGrade: "A",
        why: "Re-creates the 36% milkfat ratio essential for velvety texture.",
        when: "Soups, sauces, and baked goods (does not whip into peaks).",
        how: "Melt 1/4 cup unsalted butter, let cool slightly, then whisk vigorously into 3/4 cup warm whole milk.",
        dietaryTags: ["vegetarian"]
      },
      {
        name: "Coconut Cream",
        ratio: 1.0,
        baseGrade: "A",
        why: "Rich natural saturated fat that whips and thickens identically to dairy cream.",
        when: "Vegan whipped cream, curries, rich pasta sauces, and pie fillings.",
        how: "Chill a can of full-fat coconut milk overnight in refrigerator; scoop the solid cream layer off the top.",
        dietaryTags: ["vegan", "dairy-free"]
      },
      {
        name: "Evaporated Milk",
        ratio: 1.0,
        baseGrade: "B+",
        why: "Concentrated milk solids provide richness with 60% less water.",
        when: "Creamy soups, casseroles, and pasta bakes.",
        how: "Use 1:1 direct volume replacement straight from the can.",
        dietaryTags: ["vegetarian"]
      }
    ]
  },
  {
    targetKeywords: ["sour cream"],
    substitutes: [
      {
        name: "Plain Whole-Milk Greek Yogurt",
        ratio: 1.0,
        baseGrade: "A+",
        why: "Virtually identical lactic acidity, thickness, and mouthfeel with higher protein.",
        when: "Tacos, baked potatoes, dips, and cake batters.",
        how: "Use as an exact 1:1 direct substitute. For warm sauces, temper gently to avoid curdling.",
        dietaryTags: ["vegetarian"]
      },
      {
        name: "Blended Cottage Cheese + Lemon",
        ratio: 1.0,
        baseGrade: "B+",
        why: "Low fat curd that turns silky smooth when blended.",
        when: "Savory dips, pasta sauces, and baked casseroles.",
        how: "Purée 1 cup cottage cheese with 1 tablespoon lemon juice in blender until velvety smooth.",
        dietaryTags: ["vegetarian"]
      }
    ]
  },
  {
    targetKeywords: ["butter", "unsalted butter", "salted butter"],
    substitutes: [
      {
        name: "Refined Coconut Oil",
        ratio: 1.0,
        baseGrade: "A",
        bakingGrade: "A",
        savoryGrade: "B+",
        why: "Solid plant fat with a melting point near butter (~76°F) and zero dairy.",
        when: "Pie crusts, cookies, cakes, and pastry dough.",
        how: "Use solid coconut oil for flaky pastries, or melted coconut oil for cake batters.",
        dietaryTags: ["vegan", "dairy-free"]
      },
      {
        name: "Extra Virgin Olive Oil or Avocado Oil",
        ratio: 0.75,
        amountNote: "Use 3/4 amount (0.75x ratio): 3/4 cup oil per 1 cup butter",
        baseGrade: "A",
        bakingGrade: "B",
        savoryGrade: "A+",
        why: "Provides healthy monounsaturated fat and rich savory richness.",
        when: "Sautéing, roasting, pasta dishes, and olive oil cakes (not for cookies or buttercreams).",
        how: "Whisk liquid oil directly into liquids or sauté pan.",
        dietaryTags: ["vegan", "dairy-free"]
      },
      {
        name: "Unsweetened Applesauce",
        ratio: 0.5,
        amountNote: "Use 1/2 amount (0.5x ratio): 1/2 cup applesauce per 1 cup butter",
        baseGrade: "B+",
        bakingGrade: "A",
        savoryGrade: "D",
        why: "Fruit pectin provides soft tender moisture with zero fat and fewer calories.",
        when: "Muffins, quick breads, and brownies (never for frying or savory sauces).",
        how: "Swap 1/2 cup applesauce for 1 cup butter; lower oven temperature by 25°F.",
        dietaryTags: ["vegan", "dairy-free", "low-fat"]
      }
    ]
  },
  {
    targetKeywords: ["egg", "eggs", "large egg", "large eggs"],
    substitutes: [
      {
        name: "Flax Egg (Ground Flaxseed + Water)",
        ratio: 1.0,
        baseGrade: "A",
        why: "Soluble mucilage fibers hydrate into a viscous gel that binds batters.",
        when: "Pancakes, waffles, cookies, and quick breads.",
        how: "Whisk 1 tablespoon ground flaxseed meal with 2.5 tablespoons warm water; rest 5 minutes until gelatinous.",
        dietaryTags: ["vegan", "egg-free"]
      },
      {
        name: "Unsweetened Applesauce",
        ratio: 1.0,
        amountNote: "Use 1/4 cup (60 ml) applesauce per egg",
        baseGrade: "A",
        why: "Moisture and fruit pectin bind flour starches together.",
        when: "Dense cakes, muffins, and moist brownies.",
        how: "Stir 1/4 cup applesauce per egg into wet ingredients; add 1/4 tsp extra baking powder for rise.",
        dietaryTags: ["vegan", "egg-free"]
      },
      {
        name: "Aquafaba (Chickpea Liquid)",
        ratio: 1.0,
        amountNote: "Use 3 tbsp liquid per whole egg, or 2 tbsp per egg white",
        baseGrade: "A",
        why: "Legume proteins emulsify and whip into stiff foam like egg whites.",
        when: "Meringues, macarons, light batters, and vegan mayonnaise.",
        how: "Drain liquid directly from a can of chickpeas; whip with electric mixer until foamy or stiff.",
        dietaryTags: ["vegan", "egg-free"]
      }
    ]
  },
  {
    targetKeywords: ["granulated sugar", "white sugar", "sugar", "cane sugar"],
    substitutes: [
      {
        name: "Pure Honey",
        ratio: 0.75,
        amountNote: "Use 3/4 amount: 3/4 cup honey per 1 cup sugar; reduce recipe liquid by 2 tbsp",
        baseGrade: "B+",
        bakingGrade: "B",
        savoryGrade: "A",
        why: "Higher fructose content makes honey taste significantly sweeter than sucrose.",
        when: "Marinades, dressings, glazes, and rustic quick breads.",
        how: "Use 3/4 cup honey per cup sugar; reduce other recipe liquids by 2 tablespoons; reduce oven temp by 25°F.",
        dietaryTags: ["vegetarian"]
      },
      {
        name: "Pure Maple Syrup",
        ratio: 0.75,
        amountNote: "Use 3/4 amount: 3/4 cup syrup per 1 cup sugar; reduce liquid by 3 tbsp",
        baseGrade: "B+",
        why: "Natural amber sweetness with woodsy caramel notes.",
        when: "Granola, glazes, pancakes, and fall baking.",
        how: "Use 3/4 cup maple syrup per cup sugar; reduce other liquids by 3 tablespoons; add 1/4 tsp baking soda if leavening.",
        dietaryTags: ["vegan"]
      }
    ]
  },
  {
    targetKeywords: ["brown sugar", "light brown sugar", "dark brown sugar"],
    substitutes: [
      {
        name: "White Sugar + Molasses",
        ratio: 1.0,
        baseGrade: "A+",
        why: "Chemically identical to commercial brown sugar.",
        when: "All cookies, cakes, barbecues, and glazes.",
        how: "Blend 1 cup granulated sugar with 1 tablespoon unsulphured molasses (2 tbsp for dark brown sugar).",
        dietaryTags: ["vegan"]
      },
      {
        name: "Coconut Sugar",
        ratio: 1.0,
        baseGrade: "A",
        why: "Natural caramel notes with comparable grain structure and moisture retention.",
        when: "Cookies, crumbles, and dry rubs.",
        how: "Use 1:1 direct cup-for-cup replacement.",
        dietaryTags: ["vegan", "low-glycemic"]
      }
    ]
  },
  {
    targetKeywords: ["all-purpose flour", "ap flour", "flour", "plain flour"],
    substitutes: [
      {
        name: "1:1 Gluten-Free Baking Blend (with Xanthan)",
        ratio: 1.0,
        baseGrade: "A",
        why: "Balanced rice flour, starch, and gum ratios match wheat gluten elasticity.",
        when: "Cakes, cookies, muffins, and roux.",
        how: "Measure 1:1 cup for cup; let mixed batter rest 10 minutes before baking to hydrate starches.",
        dietaryTags: ["gluten-free"]
      },
      {
        name: "Whole Wheat Flour",
        ratio: 0.85,
        amountNote: "Use 7/8 amount: 7/8 cup per cup AP flour; add 1-2 tbsp extra water",
        baseGrade: "B+",
        why: "Retains bran and germ, absorbing significantly more liquid.",
        when: "Hearty artisan breads, rustic pancakes, and chocolate chip cookies.",
        how: "Use 7/8 cup whole wheat flour per 1 cup AP flour; add 1 tablespoon additional water or milk.",
        dietaryTags: ["whole-grain"]
      }
    ]
  },
  {
    targetKeywords: ["cornstarch", "corn starch"],
    substitutes: [
      {
        name: "Arrowroot Powder or Tapioca Starch",
        ratio: 1.0,
        baseGrade: "A+",
        why: "Pure root starches thicken at lower temperatures and create glossy translucent sauces.",
        when: "Fruit pie fillings, stir-fry glazes, and acidic sauces.",
        how: "Whisk 1:1 with equal cold water to make a slurry before stirring into warm sauce.",
        dietaryTags: ["gluten-free", "grain-free"]
      },
      {
        name: "All-Purpose Flour",
        ratio: 2.0,
        amountNote: "Use twice as much: 2 tbsp flour per 1 tbsp cornstarch",
        baseGrade: "B",
        why: "Flour contains wheat proteins so it has half the thickening power of pure starch.",
        when: "Gravies, stews, and pot pie fillings.",
        how: "Make a roux with equal butter/oil, or whisk into cold liquid; simmer 3-5 minutes to cook out raw flour taste.",
        dietaryTags: ["vegetarian"]
      }
    ]
  },
  {
    targetKeywords: ["baking powder"],
    substitutes: [
      {
        name: "Baking Soda + Cream of Tartar",
        ratio: 1.0,
        baseGrade: "A+",
        why: "Re-creates the exact alkaline bicarbonate and acidic salt reaction.",
        when: "All cakes, biscuits, scones, and quick breads.",
        how: "Mix 1/4 teaspoon baking soda with 1/2 teaspoon cream of tartar for each 1 teaspoon baking powder required.",
        dietaryTags: ["vegan", "gluten-free"]
      }
    ]
  },
  {
    targetKeywords: ["baking soda", "sodium bicarbonate"],
    substitutes: [
      {
        name: "Baking Powder",
        ratio: 3.0,
        amountNote: "Use 3x amount: 3 tsp baking powder per 1 tsp baking soda",
        baseGrade: "B",
        why: "Baking powder contains both acid and base, requiring larger volume for equal CO2 lift.",
        when: "Cookies and quick breads.",
        how: "Use 3 teaspoons baking powder for every 1 teaspoon baking soda; omit salt adjustments.",
        dietaryTags: ["vegan", "gluten-free"]
      }
    ]
  },
  {
    targetKeywords: ["garlic clove", "garlic cloves", "fresh garlic", "clove garlic"],
    substitutes: [
      {
        name: "Garlic Powder",
        ratio: 0.125,
        amountNote: "Use smaller amount: 1/8 tsp garlic powder per 1 fresh clove",
        baseGrade: "A",
        why: "Dehydrated and concentrated allicin delivers punchy garlic flavor evenly.",
        when: "Dry rubs, sauces, marinades, and dressings.",
        how: "Sprinkle 1/8 teaspoon garlic powder into liquids or seasonings for every fresh clove called for.",
        dietaryTags: ["vegan", "gluten-free"]
      }
    ]
  },
  {
    targetKeywords: ["onion", "yellow onion", "white onion"],
    substitutes: [
      {
        name: "Onion Powder",
        ratio: 0.06,
        amountNote: "Use smaller amount: 1 tbsp onion powder per 1 medium chopped onion",
        baseGrade: "A",
        why: "Concentrated dry allium flavor without liquid volume.",
        when: "Soups, stews, dry rubs, and dressings.",
        how: "Stir 1 tablespoon onion powder into dish per medium onion.",
        dietaryTags: ["vegan", "gluten-free"]
      },
      {
        name: "Shallots",
        ratio: 1.0,
        baseGrade: "A+",
        why: "Delicate sweet allium profile with subtle garlic undertone.",
        when: "Vinaigrettes, pan sauces, and delicate sauté dishes.",
        how: "Use 3 minced shallots for every 1 medium yellow onion.",
        dietaryTags: ["vegan", "gluten-free"]
      }
    ]
  },
  {
    targetKeywords: ["soy sauce"],
    substitutes: [
      {
        name: "Tamari (Gluten-Free)",
        ratio: 1.0,
        baseGrade: "A+",
        why: "Japanese brewed soy sauce made without wheat; richer umami depth.",
        when: "All stir fries, marinades, sushi, and dressings.",
        how: "Use 1:1 direct cup-for-cup swap.",
        dietaryTags: ["gluten-free"]
      },
      {
        name: "Coconut Aminos",
        ratio: 1.0,
        baseGrade: "A",
        why: "Naturally fermented coconut blossom sap; soy-free, gluten-free, and lower sodium.",
        when: "Paleo, soy-free, or low-sodium Asian cooking.",
        how: "Use 1:1 direct swap; flavor is slightly sweeter than conventional soy sauce.",
        dietaryTags: ["soy-free", "gluten-free", "paleo"]
      }
    ]
  },
  {
    targetKeywords: ["lemon juice", "fresh lemon juice"],
    substitutes: [
      {
        name: "Apple Cider Vinegar or White Wine Vinegar",
        ratio: 0.5,
        amountNote: "Use 1/2 amount: 1/2 tbsp vinegar per 1 tbsp lemon juice",
        baseGrade: "A",
        why: "Acetic acid delivers clean sharpness that balances richness.",
        when: "Salad dressings, marinades, pan deglazing, and hollandaise.",
        how: "Use half the volume of vinegar; add a tiny pinch of sugar if dish needs fruitiness.",
        dietaryTags: ["vegan"]
      },
      {
        name: "Lime Juice",
        ratio: 1.0,
        baseGrade: "A+",
        why: "Identical citrus citric acid level with zesty aromatic notes.",
        when: "Cocktails, dressings, marinades, and Mexican or Asian dishes.",
        how: "Use 1:1 direct swap.",
        dietaryTags: ["vegan"]
      }
    ]
  },
  {
    targetKeywords: ["mayonnaise", "mayo"],
    substitutes: [
      {
        name: "Plain Greek Yogurt",
        ratio: 1.0,
        baseGrade: "A",
        why: "Rich creamy emulsion with probiotic lactic acidity and zero seed oils.",
        when: "Chicken salad, tuna salad, creamy dressings, and tartar sauce.",
        how: "Use 1:1 direct swap; add a pinch of salt and dash of Dijon mustard for savory depth.",
        dietaryTags: ["vegetarian", "high-protein"]
      }
    ]
  },
  {
    targetKeywords: ["parmesan cheese", "parmesan", "parmigiano"],
    substitutes: [
      {
        name: "Pecorino Romano",
        ratio: 1.0,
        baseGrade: "A+",
        why: "Aged hard sheep milk cheese with sharp salty umami crystallization.",
        when: "Pasta dishes, carbonara, Caesar salads, and risottos.",
        how: "Grate finely 1:1; reduce added recipe salt slightly as Pecorino is saltier.",
        dietaryTags: ["gluten-free"]
      },
      {
        name: "Nutritional Yeast",
        ratio: 0.75,
        baseGrade: "B+",
        why: "Deactivated yeast flakes packed with glutamates deliver savory cheesy depth.",
        when: "Vegan pasta, roasted vegetables, and popcorn seasoning.",
        how: "Sprinkle 3/4 tablespoon nutritional yeast per tablespoon grated parmesan.",
        dietaryTags: ["vegan", "dairy-free"]
      }
    ]
  },
  {
    targetKeywords: ["dijon mustard", "dijon"],
    substitutes: [
      {
        name: "Spicy Brown or Stone-Ground Mustard",
        ratio: 1.0,
        baseGrade: "A",
        why: "Brown mustard seeds provide pungent sinigrin bite and natural emulsification.",
        when: "Vinaigrettes, sandwich spreads, and glazes.",
        how: "Use 1:1 direct swap.",
        dietaryTags: ["vegan", "gluten-free"]
      },
      {
        name: "Yellow Mustard + Splash of Vinegar",
        ratio: 1.0,
        baseGrade: "B+",
        why: "Mild turmeric mustard boosted with extra acid mimics Dijon pungency.",
        when: "Dressings, sauces, and potato salads.",
        how: "Mix 1 tablespoon yellow mustard with 1/4 teaspoon white wine vinegar or lemon juice.",
        dietaryTags: ["vegan", "gluten-free"]
      }
    ]
  },
  {
    targetKeywords: ["white wine"],
    substitutes: [
      {
        name: "Chicken Broth + Splash of Lemon Juice",
        ratio: 1.0,
        baseGrade: "A",
        why: "Savory bouillon base enhanced with fruit acid replicates wine deglazing action.",
        when: "Risottos, pan sauces, mussels, and pasta.",
        how: "Use equal broth volume; stir in 1 teaspoon lemon juice or white vinegar per 1/2 cup broth.",
        dietaryTags: ["alcohol-free"]
      }
    ]
  },
  {
    targetKeywords: ["red wine"],
    substitutes: [
      {
        name: "Beef Broth + Red Wine Vinegar",
        ratio: 1.0,
        baseGrade: "A",
        why: "Rich meaty umami with balanced acetic tang deglazes pan fond seamlessly.",
        when: "Beef stew, braises, Bolognese, and pan sauces.",
        how: "Use equal broth volume; stir in 1 tablespoon red wine vinegar per 1/2 cup broth.",
        dietaryTags: ["alcohol-free"]
      }
    ]
  },
  {
    targetKeywords: ["ricotta", "ricotta cheese"],
    substitutes: [
      {
        name: "Puréed Cottage Cheese",
        ratio: 1.0,
        baseGrade: "A+",
        why: "Mild curd texture turns into smooth creamy ricotta when processed.",
        when: "Lasagna, stuffed shells, manicotti, and cannoli filling.",
        how: "Pulse cottage cheese in food processor until velvety; drain excess whey before using.",
        dietaryTags: ["vegetarian", "high-protein"]
      }
    ]
  },
  {
    targetKeywords: ["vanilla extract"],
    substitutes: [
      {
        name: "Bourbon or Dark Rum",
        ratio: 1.0,
        baseGrade: "A",
        why: "Oak barrel aged spirits share identical vanillin and caramel aromatic compounds.",
        when: "Pancakes, chocolate cakes, cookies, and pie crusts.",
        how: "Use 1:1 direct replacement.",
        dietaryTags: ["vegan"]
      },
      {
        name: "Pure Maple Syrup",
        ratio: 1.0,
        baseGrade: "B+",
        why: "Warm amber aromatics enhance sweetness in baked treats.",
        when: "Frostings, pancakes, and cookies.",
        how: "Use 1:1 direct replacement.",
        dietaryTags: ["vegan"]
      }
    ]
  }
];

export function getSubstitutionsForIngredient(
  ingredientText: string,
  recipeContext?: {
    courses?: string[];
    tags?: string[];
    title?: string;
  }
): IngredientSubstitution[] {
  const clean = ingredientText.toLowerCase().trim();
  const isBaking = Boolean(
    recipeContext?.courses?.some((c) => /dessert|baking|breakfast|cake|bread/i.test(c)) ||
      recipeContext?.tags?.some((t) => /baking|cake|cookie|bread|pastry/i.test(t)) ||
      recipeContext?.title && /cake|cookie|muffin|bread|pie|loaf|bake/i.test(recipeContext.title)
  );

  const results: IngredientSubstitution[] = [];

  for (const rule of CULINARY_SUBSTITUTIONS_DATABASE) {
    const matched = rule.targetKeywords.some((keyword) => {
      const reg = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "i");
      return reg.test(clean);
    });

    if (matched) {
      for (const sub of rule.substitutes) {
        let finalGrade = sub.baseGrade;
        if (isBaking && sub.bakingGrade) {
          finalGrade = sub.bakingGrade;
        } else if (!isBaking && sub.savoryGrade) {
          finalGrade = sub.savoryGrade;
        }

        results.push({
          targetIngredient: ingredientText,
          substituteIngredient: sub.name,
          ratio: sub.ratio,
          amountNote: sub.amountNote,
          qualityGrade: finalGrade,
          why: sub.why,
          when: sub.when,
          how: sub.how,
          dietaryTags: sub.dietaryTags
        });
      }
    }
  }

  return results;
}
