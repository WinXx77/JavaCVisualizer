# Use Node.js 18 on Debian Bullseye with Java support
FROM node:18-bullseye

# Install OpenJDK 17, asciinema, git, and svg-term-cli globally
RUN apt-get update && apt-get install -y \
    openjdk-17-jdk-headless \
    asciinema \
    git \
    && npm install -g svg-term-cli \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json only
COPY package.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy remaining app files
COPY . .

# Expose port
EXPOSE 3000

# Set environment
ENV LANG=C.UTF-8

ENV TERM=xterm

# Start server
CMD ["node", "server.js"]
