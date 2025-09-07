const express = require("express");   // load Express framework
const cors = require("cors");         // allow frontend to talk to backend
const bodyParser = require("body-parser"); // read JSON from requests

const app = express();                // create the Express app
const PORT = 4000;                    // choose port (frontend might run on 3000)
require('dotenv').config();

// middlewares (extra features)
app.use(cors());                      // solves CORS errors when frontend calls backend
app.use(bodyParser.json());           // lets backend understand JSON input

// load routes
const schemesRoutes = require("./routes/schemes");
const adviceRoute = require("./routes/get-advice");
const aiDataQueryRoutes = require("./routes/ai-data-query");
app.use("/api/schemes", schemesRoutes); // mount all scheme routes under /api/schemes
app.use("/api", adviceRoute); // /api/get-advice
app.use("/api/ai-data", aiDataQueryRoutes); // AI data query routes

// start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
app.get("/test", (req, res) => {
  res.send("Server is working!");
});