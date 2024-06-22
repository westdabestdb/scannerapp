import { query } from 'express';
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUserTable1707229033011 implements MigrationInterface {
    name = 'CreateUserTable1707229033011'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const isSqlite = queryRunner.connection.options.type === 'sqlite';

        await queryRunner.createTable(new Table({
            name: 'user',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'fullName',
                    type: 'varchar',
                },
                {
                    name: 'createdAt',
                    type: isSqlite ? 'datetime' : 'timestamp',
                },
                {
                    name: 'email',
                    type: 'varchar',
                    isUnique: true,
                },
                {
                    name: 'role',
                    type: 'varchar',
                    default: "'user'",
                },
                {
                    name: 'accountIds',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'apiKey',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'password',
                    type: 'varchar',
                },
                {
                    name: 'isVerified',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'resetToken',
                    type: 'varchar',
                    default: "''",
                },
            ],
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('user');
    }
}