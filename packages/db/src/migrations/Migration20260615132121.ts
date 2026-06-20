import { Migration } from '@mikro-orm/migrations';

export class Migration20260615132121 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "server" add column "api_key_id" varchar(255) not null;`);
    this.addSql(`alter table "server" rename column "user_id" to "organization_id";`);
    this.addSql(`alter table "server" alter column "organization_id" set not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "server" alter column "organization_id" drop not null;`);
    this.addSql(`alter table "server" rename column "organization_id" to "user_id";`);
    this.addSql(`alter table "server" drop column "api_key_id";`);
  }

}
