# Migration Tool

This project is a Node.js-based migration utility designed to transfer data from a WordPress MySQL database to a MongoDB database. It supports migration of users, posts, media, tags, and categories, and includes utilities for formatting and queue management.

## Features

- Migrate WordPress users, posts, media, tags, and categories to MongoDB
- Reset and finalize MongoDB collections before migration
- Utilities for formatting post content and managing async queues

## Project Structure

```
migration/
├── .gitignore
├── package.json
└── src/
    ├── config.json
    ├── index.js
    ├── db/
    │   ├── mongo_connection.js
    │   └── mysql_connnection.js
    ├── models/
    │   ├── db_finalizing.js
    │   ├── db_reset.js
    │   ├── media.js
    │   ├── posts.js
    │   ├── term.js
    │   └── users.js
    └── utils/
        ├── formatPw.js
        └── queue.js
```

## Setup

1. **Install dependencies:**

   ```sh
   npm install
   ```

2. **Configure databases:**

   - Edit `src/config.json` with your MySQL and MongoDB credentials.

3. **Run migration:**

   ```sh
   node src/index.js
   ```

## Scripts

- `npm run dev` — Run with nodemon for development
- `npm run migrate` — Run migration script

## Requirements

- Node.js
- MySQL database (WordPress)
- MongoDB database

## License

See `package.json
