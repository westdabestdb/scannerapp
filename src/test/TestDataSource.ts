import { DataSource } from "typeorm";

export class TestDataSource extends DataSource {
    private static instance: TestDataSource | null;

    constructor() {
        super({
            type: 'sqlite',
            database: ':memory:',
            entities: [`${__dirname}/../entity/**/*{.js,.ts}`],
            migrations: [`${__dirname}/../migration/**/*{.js,.ts}`],
            synchronize: true,
        });
    }

    public static getInstance(): TestDataSource {
        if (!this.instance) {
            this.instance = new TestDataSource();
        }
        return this.instance;
    }

    public async initialize() {
        if (!this.isInitialized) {
            await super.initialize();
        }
        return this;
    }

    public async close() {
        if (this.isInitialized) {
            await super.destroy();
        }
    }
}