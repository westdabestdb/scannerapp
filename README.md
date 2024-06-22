# scanner_backend
Node v20.10.0

## Running
Before running locally, you need to set a database.
- Create a file src/database/database.sqlite (do not commit this file).
- Run db:migrate

In order to run, you must have ts-node-dev installed globally. Please refer to their docs. You can configure the ngrok url in package.json.
- npm i
- npm run dev
- npm run ngrok

## Database migrations
To migrate, run npm run db:migrate

In order to create new migrations, please refer to typeorm docs. You can also use the npm script db:generate as such:
npm run db:generate ./src/migration/YourNewMigration. This will generate a migration based on the entity changes since the last migration.

## Testing
npm run test
