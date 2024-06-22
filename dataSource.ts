import { DataSource } from "typeorm"
import dotenv from 'dotenv';

dotenv.config();

const {
    ENV,
    DB_ID,
    DB_HOST,
    DB_PORT,
    DB_USERNAME,
    DB_PASSWORD,
} = process.env;

const localDataSource = {
    type: "sqlite",
    database: `${__dirname}/src/database/database.sqlite`,
    entities: [`${__dirname}/src/entity/**/*{.js,.ts}`],
    migrations: [`${__dirname}/src/migration/**/*{.js,.ts}`],
};

const remoteDataSource = {
    type: "postgres",
    database: DB_ID,
    host: DB_HOST,
    port: Number(DB_PORT),
    username: DB_USERNAME,
    password: DB_PASSWORD,
    entities: [`${__dirname}/src/entity/**/*{.js,.ts}`],
    migrations: [`${__dirname}/src/migration/**/*{.js,.ts}`],
    ssl: ENV === 'local' ? false : {
        rejectUnauthorized: false,
    },
};

const dataSourceConfig = ENV === 'local' ? localDataSource : remoteDataSource;

// @ts-ignore
const dataSource = new DataSource(dataSourceConfig);

export { dataSource };
