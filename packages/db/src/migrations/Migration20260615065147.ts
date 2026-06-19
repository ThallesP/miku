import { Migration } from '@mikro-orm/migrations';

export class Migration20260615065147 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "server" add column "user_id" varchar(255) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "server" drop column "user_id";`);
  }

}
