# Migration Tool

A Node.js utility for migrating WordPress data from MySQL to MongoDB. This project includes models for users, posts, media, tags, and categories, as well as utilities for formatting, queueing, and document normalization. This tool is only used for Fresh Group's web CMS with data that has already been adjusted.

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
        ├── queue.js
        └── normalize.mongo.doc.js
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
   npm run migrate
   ```

## Requirements

- Node.js
- MySQL database (WordPress)
- MongoDB database
