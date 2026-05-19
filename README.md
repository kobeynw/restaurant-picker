# LunchSpin

A local-network lunch decision app for picking where to eat as a group.

## Tech Stack

- **Client:** React, React Router, Vite, Tailwind CSS
- **Server:** Node.js, Express, Socket.IO
- **Other:** nanoid, qrcode

## Data

All restaurant data is contained in data/restaurants.json. Replace the entries in this file with your local restaurant 
data.

## Commands

### Development

```bash
# Run client and server together in development
npm run dev

# Run server only
npm run dev:server

# Run client only
npm run dev:client
```

Run these commands to test functionality on one machine. Run the production commands to test across different machines 
on the same network.

### Production

```bash
# Install dependencies
npm install

# Build the client for production
npm run build

# Start the production server
npm start
```

Run these commands to host a server that is accessible across multiple devices on the same network.
