# Stage 1: Build the React application
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json ./
COPY .env ./ # Copy .env for build process
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:stable-alpine
# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built React app
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]