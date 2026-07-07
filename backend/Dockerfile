FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY src ./src

# Create data directory for SQLite/PDFs
RUN mkdir -p data/tickets

# Expose port
EXPOSE 3001

# Start app
CMD ["npm", "start"]
