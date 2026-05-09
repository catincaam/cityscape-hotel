process.env.NODE_NO_WARNINGS = "1";
process.noDeprecation = true;

process.argv = [
  process.argv[0],
  require.resolve("react-scripts/bin/react-scripts.js"),
  ...process.argv.slice(2)
];

require("react-scripts/bin/react-scripts.js");
