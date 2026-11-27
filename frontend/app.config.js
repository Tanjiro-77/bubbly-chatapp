const fs = require("fs");
const path = require("path");
const baseConfig = require("./app.json");

module.exports = () => {
  const expo = {
    ...baseConfig.expo,
    android: {
      ...baseConfig.expo.android,
    },
  };

  const localGoogleServicesPath = path.resolve(__dirname, "google-services.json");
  if (process.env.GOOGLE_SERVICES_JSON_PATH) {
    expo.android.googleServicesFile = process.env.GOOGLE_SERVICES_JSON_PATH;
  } else if (fs.existsSync(localGoogleServicesPath)) {
    expo.android.googleServicesFile = "./google-services.json";
  }

  return { expo };
};
