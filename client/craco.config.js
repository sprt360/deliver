const purgecss = require("@fullhuman/postcss-purgecss");

module.exports = {
  style: {
    postcss: {
      plugins:
        process.env.NODE_ENV === "production"
          ? [
              purgecss({
                content: [
                  "./src/**/*.html",
                  "./src/**/*.tsx",
                  "./src/**/*.ts",
                  "./src/**/*.js"
                ],
                // Include any special characters you're using in this regular expression
                defaultExtractor: content =>
                  content.match(/[\w-/:]+(?<!:)/g) || []
              })
            ]
          : []
    }
  }
};
