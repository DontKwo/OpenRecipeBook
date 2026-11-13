export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime: boolean;
  server?: {
    androidScheme?: string;
  };
}

const config: CapacitorConfig = {
  appId: "org.openrecipebook.app",
  appName: "OpenRecipeBook",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https"
  }
};

export default config;
