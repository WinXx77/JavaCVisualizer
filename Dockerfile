# Use lightweight Node.js base image with Debian and install Java only
FROM node:18-bullseye

# Install OpenJDK 17 only (remove other language compilers)
RUN apt-get update && apt-get install -y \
    openjdk-17-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json only
COPY package.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy remaining files
COPY . .

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
