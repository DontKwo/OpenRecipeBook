import { zipSync, strToU8 } from "fflate";

export function generateSyntheticRecipeKeeperZip(): Uint8Array {
  const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Recipe Keeper Export</title></head>
<body>
  <div itemscope itemtype="http://schema.org/Recipe" class="recipe">
    <h1 itemprop="name">Rustic Herb Bread</h1>
    <p itemprop="description">Crusty artisan loaf with fresh rosemary.</p>
    <span itemprop="recipeYield">1 loaf</span>
    <time itemprop="prepTime" content="PT20M">20 mins</time>
    <time itemprop="cookTime" content="PT35M">35 mins</time>
    <span itemprop="recipeCategory">Baking</span>
    <span itemprop="ratingValue">5</span>
    <ul class="ingredients">
      <li itemprop="recipeIngredient">3 cups bread flour</li>
      <li itemprop="recipeIngredient">1 1/4 cups warm water</li>
      <li itemprop="recipeIngredient">1 tsp active dry yeast</li>
      <li itemprop="recipeIngredient">1 1/2 tsp salt</li>
    </ul>
    <ol class="instructions">
      <li itemprop="recipeInstructions">Stir flour, yeast, and salt together in large bowl.</li>
      <li itemprop="recipeInstructions">Add warm water and mix into sticky dough.</li>
      <li itemprop="recipeInstructions">Let rise 12 hours at room temperature.</li>
      <li itemprop="recipeInstructions">Bake in preheated Dutch oven at 450 degrees F for 35 minutes.</li>
    </ol>
    <div class="notes">Use parchment paper for easy loaf transfer.</div>
  </div>
  <div itemscope itemtype="http://schema.org/Recipe" class="recipe">
    <h1 itemprop="name">Lemon Blueberry Scones</h1>
    <p itemprop="description">Tender cream scones with fresh berries and citrus glaze.</p>
    <span itemprop="recipeYield">8 scones</span>
    <time itemprop="prepTime" content="PT15M">15 mins</time>
    <time itemprop="cookTime" content="PT20M">20 mins</time>
    <span itemprop="recipeCategory">Breakfast</span>
    <span itemprop="ratingValue">4</span>
    <ul class="ingredients">
      <li itemprop="recipeIngredient">2 cups all-purpose flour</li>
      <li itemprop="recipeIngredient">1/3 cup sugar</li>
      <li itemprop="recipeIngredient">1 tbsp baking powder</li>
      <li itemprop="recipeIngredient">1/2 cup cold butter</li>
      <li itemprop="recipeIngredient">1 cup fresh blueberries</li>
    </ul>
    <ol class="instructions">
      <li itemprop="recipeInstructions">Whisk flour, sugar, and baking powder.</li>
      <li itemprop="recipeInstructions">Cut in cold butter until coarse crumbs form.</li>
      <li itemprop="recipeInstructions">Gently fold in blueberries.</li>
      <li itemprop="recipeInstructions">Bake at 400 degrees F for 20 minutes until lightly browned.</li>
    </ol>
  </div>
</body>
</html>`;

  const files: Record<string, Uint8Array> = {
    "recipes.html": strToU8(htmlContent),
    "images/loaf.jpg": new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
    "images/scones.jpg": new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
  };

  return zipSync(files);
}
