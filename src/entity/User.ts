import { v4 as uuidv4 } from "uuid";
import {
    Entity,
    Column,
    BaseEntity,
    BeforeInsert,
    PrimaryGeneratedColumn,
} from "typeorm";

type Role = 'user' | 'manager';

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    fullName: string;

    @Column()
    createdAt: Date;

    @Column({ unique: true })
    email: string;

    @Column({ default: 'user' })
    role: Role;

    @Column({ nullable: true })
    accountIds: string;

    @Column({ nullable: true })
    apiKey: string;

    @Column()
    password: string;

    @Column({ type: 'int', default: 0 })
    isVerified: number;

    @Column({ default: '' })
    resetToken: string;

    @BeforeInsert()
    async beforeInsert() {
        this.id = uuidv4();
    }
}