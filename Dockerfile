# Use the official Node.js 18 image as a base
FROM node:20

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json to /app
COPY package*.json ./

# Install dependencies using npm
RUN npm install

# Copy the rest of the app code to /app
COPY . .

# Expose port 3000
EXPOSE 3000

# Set the environment variable NODE_ENV to production
ENV NODE_ENV=production

# Start the app using node
CMD ["npm", "run", "hosting"]
