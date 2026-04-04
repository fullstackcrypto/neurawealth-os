app.set('trust proxy', 1);
const helmet = require('helmet');

// Improved Content Security Policy (CSP) setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", process.env.VITE_ANALYTICS_ENDPOINT],
      styleSrc: ["'self'"]
    }
  }
}));