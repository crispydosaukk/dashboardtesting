module.exports = {
  apps: [
    {
      name: "cd-backend",
      cwd: "./backend",
      script: "npm",
      args: "start",
      watch: false
    },
    {
      name: "cd-frontend",
      cwd: "./frontend",
      script: "npx",
      args: "serve -s dist -l 3001",
      env: {
        PORT: 3001
      }
    }
  ]
};
