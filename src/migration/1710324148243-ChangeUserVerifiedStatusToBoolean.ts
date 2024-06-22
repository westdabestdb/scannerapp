import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeUserVerifiedStatusToBoolean1710324148243 implements MigrationInterface {
    name = 'ChangeUserVerifiedStatusToBoolean1710324148243'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_user" ("id" varchar PRIMARY KEY NOT NULL, "fullName" varchar NOT NULL, "createdAt" datetime NOT NULL, "email" varchar NOT NULL, "role" varchar NOT NULL DEFAULT ('user'), "accountIds" varchar, "apiKey" varchar, "password" varchar NOT NULL, "isVerified" integer NOT NULL DEFAULT (0), "resetToken" varchar NOT NULL DEFAULT (''), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"))`);
        await queryRunner.query(`INSERT INTO "temporary_user"("id", "fullName", "createdAt", "email", "role", "accountIds", "apiKey", "password", "isVerified", "resetToken") SELECT "id", "fullName", "createdAt", "email", "role", "accountIds", "apiKey", "password", "isVerified", "resetToken" FROM "user"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`ALTER TABLE "temporary_user" RENAME TO "user"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" RENAME TO "temporary_user"`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid PRIMARY KEY NOT NULL DEFAULT (uuid_generate_v4()), "fullName" varchar NOT NULL, "createdAt" datetime NOT NULL, "email" varchar NOT NULL, "role" varchar NOT NULL DEFAULT ('user'), "accountIds" varchar, "apiKey" varchar, "password" varchar NOT NULL, "isVerified" int NOT NULL DEFAULT (0), "resetToken" varchar NOT NULL DEFAULT (''), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"))`);
        await queryRunner.query(`INSERT INTO "user"("id", "fullName", "createdAt", "email", "role", "accountIds", "apiKey", "password", "isVerified", "resetToken") SELECT "id", "fullName", "createdAt", "email", "role", "accountIds", "apiKey", "password", "isVerified", "resetToken" FROM "temporary_user"`);
        await queryRunner.query(`DROP TABLE "temporary_user"`);
    }

}
