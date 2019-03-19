const presets = [
  [
    "@babel/env",
    {
      targets: {
        ie: "11",
      },
      useBuiltIns: "usage",
    },
  ],
];

module.exports = { presets };

