require("./preflight-sentinel").rejectIfDrifted(require("node:path").join(__dirname, "lint-graph.js"));
