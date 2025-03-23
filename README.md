# TT-BBS: A Modular BBS System

TT-BBS is a modern take on the classic Bulletin Board System, built with Next.js and designed to be fully modular. It allows anyone to host their own BBS with a selection of apps that they choose to install.

## Features

- Classic terminal-style BBS interface
- Modular app system for easy extension
- Self-contained npm packages for BBS apps
- Simple API for creating new apps
- Supports session management and user profiles
- Retro ASCII art and styling

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/tt-bbs.git
cd tt-bbs
npm install
```

## Database Setup

TT-BBS uses MongoDB for data storage. You'll need to set up a MongoDB database before running the application.

### Local MongoDB Setup

1. Install MongoDB on your local machine following the [official instructions](https://docs.mongodb.com/manual/installation/).
2. Start the MongoDB service.
3. Create a `.env.local` file in the root directory of the project by copying the example file:

```bash
cp .env.local.example .env.local
```

4. Edit the `.env.local` file to set your MongoDB connection string:

```
MONGODB_URI=mongodb://localhost:27017/tt-bbs
```

### Using MongoDB Atlas (Cloud)

1. Create a free account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new cluster and follow the setup instructions.
3. Once your cluster is created, click on "Connect" and select "Connect your application".
4. Copy the connection string and replace `<username>`, `<password>`, and `<dbname>` with your credentials.
5. Create a `.env.local` file in the root directory of the project and add your connection string:

```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/tt-bbs?retryWrites=true&w=majority
```

## Running the Application

Start the development server:

```bash
npm run dev
```

The BBS will be available at http://localhost:3000.

## Docker Deployment

TT-BBS can be easily deployed using Docker, which provides a consistent environment and ensures all features work correctly, including npm package discovery and installation.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Deployment Steps

1. Clone the repository:

```bash
git clone https://github.com/yourusername/tt-bbs.git
cd tt-bbs
```

2. Start the application using Docker Compose:

```bash
docker-compose up -d
```

This will:

- Build the TT-BBS container
- Start a MongoDB container
- Create persistent volumes for data storage
- Expose the application on port 3000

### Persistent Storage

The Docker setup includes three persistent volumes:

- **bbs-apps**: Stores custom BBS apps installed in the file system
- **npm-packages**: Persists npm packages between container restarts
- **mongo-data**: Stores the MongoDB database

This ensures that your installed apps and user data remain available even after restarting the container.

### Accessing the Container Shell

To install npm packages or perform maintenance:

```bash
docker-compose exec tt-bbs /bin/sh
```

Once inside the container, you can use npm commands to install BBS apps:

```bash
# Inside the container
npm install your-bbs-app
```

### Viewing Logs

To view application logs:

```bash
docker-compose logs -f tt-bbs
```

### Stopping the Application

To stop the application:

```bash
docker-compose down
```

To completely remove all containers and volumes:

```bash
docker-compose down -v
```

## Apps

TT-BBS comes with a few built-in apps:

- **Message Boards**: A traditional BBS message board system
- **Hangman**: A classic word guessing game
- And more to come!

You can install additional apps from npm or create your own.

## Creating BBS Apps

TT-BBS is designed to be extended with custom apps. You can create your own BBS app by following these guidelines:

### App Structure

A BBS app is an npm package that exports an object implementing the `BbsApp` interface:

```typescript
export interface BbsApp {
  id: string; // Unique identifier for the app
  name: string; // Display name for the app
  version: string; // App version
  description: string; // App description
  author: string; // App author

  // Core methods
  getWelcomeScreen: () => string;
  handleCommand: (screenId: string | null, command: string, session: any) => CommandResult;
  getHelp: (screenId: string | null) => string;

  // Optional lifecycle hooks
  onInit?: () => void;
  onUserEnter?: (userId: string, session: any) => void;
  onUserExit?: (userId: string, session: any) => void;
}

export interface CommandResult {
  screen: string | null; // Screen to display (null to exit the app)
  response: string; // Text response to display
  refresh: boolean; // Whether to refresh the whole screen
  data?: any; // Optional data to pass back to the client
}
```

### App Lifecycle

1. **Loading**: When the BBS starts, it discovers and loads all installed apps.
2. **Initialization**: The `onInit` method is called for each app when it's loaded.
3. **User Interaction**: When a user selects your app from the main menu, the system:
   - Sets the current area to `appId:home`
   - Calls your app's `getWelcomeScreen` method to display the initial screen
   - Routes all user commands to your app's `handleCommand` method until the user exits

### Screens and Navigation

Your app can have multiple screens, identified by a string ID. The system tracks the current screen in the format `appId:screenId`. When handling commands, your app can return a new screen ID to navigate to different screens within your app.

To exit your app and return to the main menu, return `null` as the screen value in your `CommandResult`.

### Example App

Here's a minimal example of a "Hello World" BBS app:

```typescript
import { BbsApp, CommandResult } from 'tt-bbs/api';

const HelloWorldApp: BbsApp = {
  id: 'hello',
  name: 'Hello World',
  version: '1.0.0',
  description: 'A simple Hello World app',
  author: 'Your Name',

  getWelcomeScreen(): string {
    return `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

HELLO WORLD

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

Welcome to the Hello World app!

Type SAY followed by a message to see it echoed back.
Type B to return to the main menu.
`;
  },

  handleCommand(screenId, command, session): CommandResult {
    const cmd = command.trim().toUpperCase();

    // Check for the SAY command
    if (cmd.startsWith('SAY ')) {
      const message = command.substring(4);
      return {
        screen: 'home',
        response: `You said: ${message}\n\nType SAY to say something else, or B to go back.`,
        refresh: false,
      };
    }

    // Check for the back command
    if (cmd === 'B' || cmd === 'BACK') {
      return {
        screen: null,
        response: 'Returning to main menu...',
        refresh: true,
      };
    }

    // Default response for invalid commands
    return {
      screen: 'home',
      response: `Unknown command: ${command}\nType SAY followed by a message, or B to go back.`,
      refresh: false,
    };
  },

  getHelp(screenId): string {
    return `
HELLO WORLD COMMANDS:
SAY [message] - Echo a message back
B - Return to main menu
`;
  },
};

export default HelloWorldApp;
```

### Publishing Your App

To make your app available to other BBS operators:

1. Create a new npm package with your app implementation
2. Add `bbs-app` to the keywords in your package.json
3. Export your app as the default export
4. Publish to npm

### Installing Apps

BBS operators can install apps using:

```bash
npm install bbs-app-yourappname
```

The BBS will automatically discover and load all installed apps with the `bbs-app` keyword on startup.

## Customizing Your BBS

You can customize the look and feel of your BBS by editing the configuration files:

- `config/site.ts`: Site information, name, welcome message, etc.
- `config/theme.ts`: Colors, ASCII art, and styling

## BBS SDK

The project includes a standalone SDK package located at the root level of the repository (`../bbs-sdk`). This SDK provides all the TypeScript interfaces and types needed to build BBS apps.

### Using the SDK

To create a new BBS app, you can use the SDK as follows:

```typescript
import { BbsApp, CommandResult, BbsSession } from 'bbs-sdk';

// Implement the BbsApp interface
const MyApp: BbsApp = {
  // App properties and methods
  // ...
};

export default MyApp;
```

For more details, see the [BBS SDK README](../bbs-sdk/README.md) or check out the [app template](./bbs-app-template/index.ts).

## License

MIT
