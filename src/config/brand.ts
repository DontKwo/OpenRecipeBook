export interface BrandConfig {
  appName: string;
  shortName: string;
  packageId: string;
  tagline: string;
  repositoryUrl: string;
}

export const BRAND: BrandConfig = {
  appName: "OpenRecipeBook",
  shortName: "RecipeBook",
  packageId: "org.openrecipebook.app",
  tagline: "Free personal cookbook manager",
  repositoryUrl: "https://github.com/DontKwo/OpenRecipeBook"
};
