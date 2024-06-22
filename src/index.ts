import "reflect-metadata";
import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import Handlebars from 'handlebars';
import { engine } from "express-handlebars";

import { dataSource } from "../dataSource";
import { apiRouter } from 'api/apiRoutes';
import { viewRouter } from 'views/viewRoutes';

dotenv.config();

const { HOST, PORT } = process.env;
const app = express();

app.engine('.hbs', engine({ extname: '.hbs' }));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

Handlebars.registerHelper('eq', function (arg1, arg2) {
    return (arg1 === arg2);
});

dataSource.initialize().then(async () => {
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use('/api/v1', apiRouter);
    app.use('/', viewRouter);
    app.listen(Number(PORT), HOST || '', () => {
        console.debug(`Server running at http://${HOST}:${PORT}/`);
    });
}).catch(error => console.debug(error))
